const path = require('path');
const merge = require('webpack-merge');
const webpack = require('webpack');
const NpmInstallPlugin = require('npm-install-webpack-plugin');
const stylelint = require('stylelint');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
// Load *package.json* so we can use `dependencies` from there
const pkg = require('./package.json');

const TARGET = process.env.npm_lifecycle_event;
const PATHS = {
    app: path.join(__dirname, 'app'),
    build: path.join(__dirname, 'build'),
    style: path.join(__dirname, 'app/main.css'),
    test: path.join(__dirname, 'tests')
};


process.env.BABEL_ENV = TARGET;

const common = {
    // Entry accepts a path or an object of entries. We'll be using the
    // latter form given it's convenient with more complex configurations
    
    entry: {
        app: PATHS.app,
        style: PATHS.style
    },
    // Add resolve.extensions
    // '' is needed to allow imports without an extensions
    // Note the .'s before extensions as it will fail to match without!!!
    resolve: {
        extensions: ['', '.js', '.jsx']
    },
    output: {
        path: PATHS.build,
        // Output using entry name
        filename: '[name].[chunkhash].js',
        chunkFilename: '[chunkhash].js'
    },
    module: {
        preLoaders: [
            {
                test: /\.jsx?$/,
                loaders: ['eslint'],
                include: PATHS.app
            },
            {
                test: /\.css$/,
                loaders: ['postcss'],
                include: PATHS.app
            },           
        ],
        loaders: [
            // Set up jsx. This accepts js too thanks to RegExp
            {
                test: /\.jsx?$/,
                loaders: ['babel?cacheDirectory'],
                include: PATHS.app
            }
        ]
    },
    postcss: function () {
        return [stylelint({
            rules: {
                'color-hex-case': 'lower'
            }
        })]
    },
    plugins : [
        new HtmlWebpackPlugin({
            template: 'node_modules/html-webpack-template/index.ejs',
            title: 'Kanban app',
            appMountId: 'app',
            inject: false
        })
    ]
};

//Default configuration
if(TARGET === 'start' || !TARGET) {
    module.exports = merge(common, {
        entry: {
            style: PATHS.style
        },
        devtool: 'eval-source-map',
        devServer: {

            // Enable history API fallback sp HTML5 History API based
            // routing works. This is a good default that will come
            // in handy in more complicated setups.
            historyApiFallback: true,
            hot: true,
            inline : true,
            progress: true,

            // Display only errors to reduce the amount of output.
            stats: 'errors-only',

            // Parse host and port from env so this is easy to customise
            //
            // If you use Vagrant or Cloud9, set
            // host: process.env.HOST || '0.0.0.0';
            //
            // 0.0.0.0 is available to all network devices unlike default
            // localhost
            host: process.env.HOST,
            port: process.env.PORT
        },
        module : {
            loaders: [
                // Define development specific CSS setup
                {
                    test: /\.css$/,
                    loaders: ['style', 'css'],
                    include: PATHS.app
                }
            ]
        },
        plugins: [
            new webpack.HotModuleReplacementPlugin(),
            new NpmInstallPlugin({
                save: true // --save
            })
        ]
    });
}

if(TARGET === 'build' || TARGET === 'stats') {
    module.exports = merge(common, {
        // Define vendor entry point needed for splitting
        entry: {
            vendor: Object.keys(pkg.dependencies).filter(function(v) {
                // Exclude alt-utils as it won't work with this setup
                // due to the way the package has been designed
                // (no package.json main)
                return v !== 'alt-utils';
            }),
            style: PATHS.style
        },
        module: {
            loaders: [
                {
                    test: /\.css$/,
                    loader: ExtractTextPlugin.extract('style', 'css'),
                    include: PATHS.app,
                }
            ]
        },
        plugins: [
            new CleanPlugin(PATHS.build),
            // Ouput extracted CSS to a filename
            new ExtractTextPlugin('[name].[chunkhash].css'),
            // Extract vendor and manifest files
            new webpack.optimize.CommonsChunkPlugin({
                names: ['vendor', 'manifest']
            }),
            // Settings DefinePlugin affects React library size!
            // DefinePlugin replaces content "as is" so we need some extra quotes
            // for the generated code to make sense
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': '"production"'
                
                // You can set this to JSON.stringify('development') for your
                // development target to force NODE_ENV to development mode
                // no matter what
            }),            
            new webpack.optimize.UglifyJsPlugin({
                compress: {
                    warnings: false
                }
            })
        ]
    });
}

if(TARGET === 'test' || TARGET === 'tdd') {
    module.exports = merge(common, {
        devtools: 'inline-source-map',
        resolve: {
            alias: {
                'app': PATHS.app
            }
        },
        module : {
            preLoaders: [
                {
                    test: /\.jsx?$/,
                    loaders: ['isparta-instrumenter'],
                    include: PATHS.app
                }
            ],
            loaders: [
                {
                    test: /\.jsx?$/,
                    loaders: ['babel?cacheDirectory'],
                    include: PATHS.test
                }
            ]
        }
    });
}