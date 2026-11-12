const path = require("path");
const zlib = require("zlib");
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const shouldCompress = env && env.compress;
  
  return {
    mode: isProduction ? 'production' : 'development',
    entry: "./src/index.js",
    output: {
      filename: "[name].bundle.js",
      // Lazy chunks are hashed so a browser never pairs a new main bundle with a cached chunk;
      // clean removes the previous build's hashed chunks and any stale .gz/.br files.
      chunkFilename: "[name].[contenthash:8].chunk.js",
      path: path.resolve(__dirname, "static/dist"),
      clean: true,
    },
    optimization: {
      minimize: isProduction,
      concatenateModules: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
              passes: 2
            },
            format: {
              comments: false
            }
          },
          extractComments: false
        })
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // templates/layout*.html hardcode the react, vendors and main bundles, so no other
          // initial chunk may appear; lazy chunks keep their own dependencies.
          defaultVendors: false,
          default: false,
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 10
          },
          vendors: {
            test: /[\\/]node_modules[\\/](?!(react|react-dom)[\\/])/,
            name: 'vendors',
            // 'initial', not 'all': a fixed name would merge lazy-only libraries back in here.
            chunks: 'initial',
            priority: -10
          },
        },
      },
    },
    plugins: [
      ...(shouldCompress ? [
        new CompressionPlugin({
          test: /\.js$/,
          algorithm: 'gzip'
        }),
        new CompressionPlugin({
          test: /\.js$/,
          algorithm: 'brotliCompress',
          filename: '[path][base].br',
          compressionOptions: {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 11
            }
          }
        })
      ] : [])
    ],
    performance: {
      maxAssetSize: 1572864,
      maxEntrypointSize: 1572864
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          include: [path.resolve(__dirname, "src")],
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                ["@babel/preset-env", {
                  modules: false,
                  useBuiltIns: "usage",
                  corejs: 3
                }],
                "@babel/preset-react"
              ],
              plugins: isProduction ? [
                "transform-react-remove-prop-types"
              ] : []
            }
          }
        },

	{
	  test: /\.ya?ml$/,
	  use: 'yaml-loader'
	}
      ],
    },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      '@composer_index': path.resolve(__dirname, 'src/composer', 'index.js')
    },
  },

  };
};
