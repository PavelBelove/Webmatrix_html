export class Spoiler {
  constructor(title, content, isOpen = false) {
    this.element = document.createElement('div');
    this.button = document.createElement('button');
    this.contentDiv = document.createElement('div');

    this.button.className = 'collapsible';
    this.button.textContent = title;

    this.contentDiv.className = 'content';
    if (typeof content === 'string') {
      this.contentDiv.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.contentDiv.appendChild(content);
    }

    this.element.appendChild(this.button);
    this.element.appendChild(this.contentDiv);

    this.button.addEventListener('click', () => this.toggle());

    if (isOpen) {
      this.open();
    }
  }

  toggle() {
    if (this.contentDiv.style.display === 'block') {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.button.classList.add('active');
    this.contentDiv.style.display = 'block';
  }

  close() {
    this.button.classList.remove('active');
    this.contentDiv.style.display = 'none';
  }

  render(parent) {
    parent.appendChild(this.element);
    return this;
  }

  setContent(content) {
    if (typeof content === 'string') {
      this.contentDiv.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.contentDiv.innerHTML = '';
      this.contentDiv.appendChild(content);
    }
    return this;
  }
}
