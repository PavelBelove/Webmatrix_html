{
  externals: {
    'marked': 'marked',
    'xlsx': 'XLSX',
    // CDN зависимости
  },
  optimization: {
    minimize: true,
    splitChunks: false, // Всё в один файл
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  }
} 