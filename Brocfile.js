var env = require('broccoli-env').getEnv(),
    mergeTrees = require('broccoli-merge-trees'),
    pickFiles = require('broccoli-static-compiler'),
    concat = require('broccoli-concat'),
    uglifyJs = require('broccoli-uglify-js'),
    compileLess = require('broccoli-less-single'),
    buildTemplates = require('broccoli-template-builder'),
    compileTemplates = require('ember-template-compiler'),
    sourceTree = 'lib',
    stylesTree = 'lib/styles',
    js,
    css,
    demoCss,
    prodJs,
    prodCss;

js = concat(sourceTree, {
    inputFiles: [
        'components/**/*.js',
        'views/**/*.js',
        'main.js'
    ],
    outputFile: '/ember-spin-box.js'
});

css = compileLess(
    [stylesTree], 
    'ember-spin-box.less', 
    'ember-spin-box.css', 
    {compress: false}
);

demoCss = compileLess(
    [stylesTree],
    'demo.less',
    'demo.css'
);

//create minified versions for production
if(env === 'production') {
    prodJs = uglifyJs(concat(sourceTree, {
        inputFiles: [
            'components/**/*.js'
        ],
        outputFile: '/ember-spin-box.min.js'
    }));

    prodCss = compileLess(
        [stylesTree], 
        'ember-spin-box.less', 
        'ember-spin-box.min.css', 
        {cleancss: true}
    );
}

module.exports = mergeTrees(env === 'production' ? [prodJs, prodCss, js, css, demoCss] : [js, css, demoCss]);