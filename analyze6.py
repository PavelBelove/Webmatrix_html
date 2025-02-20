import os
import pandas as pd
import requests

# Your API key
YOUR_API_KEY = ""  # Замените на ваш действительный ключ

# Список доступных CSV и Excel файлов в текущей директории
files = [f for f in os.listdir('.') if f.endswith('.csv') or f.endswith('.xlsx')]

if not files:
    print("No CSV or Excel files found in the current directory.")
    exit()

# Вывод списка доступных файлов
print("Available files:")
for i, file in enumerate(files, start=1):
    print(f"{i}. {file}")

# Выбор файла пользователем
while True:
    try:
        choice = int(input("What file should I process? "))
        if 1 <= choice <= len(files):
            selected_file = files[choice - 1]
            break
        else:
            print("Invalid choice. Please enter a number from the list.")
    except ValueError:
        print("Invalid input. Please enter a number.")

# Загрузка выбранного файла
df = pd.read_csv(selected_file) if selected_file.endswith('.csv') else pd.read_excel(selected_file)

# Вывод доступных колонок
print("Available columns:")
for i, column in enumerate(df.columns, start=1):
    print(f"{i}. {column}")

# Выбор колонки с URL сайтов
while True:
    try:
        col_choice = int(input("Where the websites are? "))
        if 1 <= col_choice <= len(df.columns):
            site_column = df.columns[col_choice - 1]
            break
        else:
            print("Invalid choice. Please enter a number from the list.")
    except ValueError:
        print("Invalid input. Please enter a number.")

# Ввод пользовательского запроса
user_prompt = input("Insert the prompt. Use the variable {site} to mention the website from the list:  ")

# Выбор количества строк для обработки
total_rows = len(df)
while True:
    try:
        row_count = int(input(f"How many rows out of {total_rows} should I process? "))
        if 1 <= row_count <= total_rows:
            df = df.iloc[:row_count]  # Выбираем только указанное количество строк
            break
        else:
            print("Invalid number. Please enter a value between 1 and the total number of rows.")
    except ValueError:
        print("Invalid input. Please enter a number.")

# Функция для анализа сайта через Perplexity AI
def analyze_site(site):
    headers = {
        "Authorization": f"Bearer {YOUR_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "sonar-pro",
        "messages": [
            {"role": "system", "content": "You are an AI assistant that analyzes company websites."},
            {"role": "user", "content": user_prompt.replace("{site}", site)}
        ]
    }
    
    try:
        response = requests.post("https://api.perplexity.ai/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        
        if not result.get('choices'):
            return "No data", ""
        
        content = result['choices'][0]['message']['content']
        citations = result.get('citations', [])
        links_text = "\n".join(citations)
        
        if links_text:
            content += f"\n\nSources:\n{links_text}"
        
        return content, links_text

    except Exception as e:
        return f"Error: {e}", ""

# Проверка существования выбранной колонки
if site_column not in df.columns:
    print("Error: The selected column does not exist in the file. Please check the file!")
    exit()

# Анализ каждого сайта и добавление результатов в новые колонки
df[["Analysis", "Sources"]] = df[site_column].apply(lambda x: pd.Series(analyze_site(x)))

# Сохранение результатов в новый файл
output_file = "analyzed_" + selected_file
if selected_file.endswith('.csv'):
    df.to_csv(output_file, index=False)
else:
    df.to_excel(output_file, index=False)
print(f"✅ Analysis completed! File {output_file} has been saved.")
