var compileLess = require('broccoli-less-single');
var stylesTree = 'lib/styles';

var css = compileLess(
    [stylesTree], 
    'demo.less', 
    'demo.css'
);

module.exports = css;