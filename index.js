var riot = require('riot-compiler'),
    loaderUtils = require('loader-utils');

var ts = require('typescript');
var temp = require('temp').track();
var path = require('path');
var fs = require('fs');

module.exports = function (source) {

  var content = source;
  var options = loaderUtils.parseQuery(this.query);

  if (this.cacheable) this.cacheable();

  Object.keys(options).forEach(function(key) {
    switch(options[key]) {
      case 'true':
        options[key] = true;
        break;
      case 'false':
        options[key] = false;
        break;
      case 'undefined':
        options[key] = undefined;
        break;
      case 'null':
        options[key] = null;
        break;
    }
  });

  var me = this;
  var typescriptCompilerOptions = JSON.parse(options.typescript || '{}');
  options.parser = function(content, options) {
    var tempFile = temp.openSync({
      dir: me.context,
      prefix: 'riotjs-loader',
      suffix: '.ts'
    });
    fs.writeFileSync(tempFile.fd, content);
    var tempFilePath = tempFile.path;
    var extname = path.extname(tempFilePath);
    var tempFilePathWithoutExtension = tempFilePath.slice(0, -extname.length);
    var jsFileName = tempFilePathWithoutExtension + '.js';
    var program = ts.createProgram([tempFile.path], typescriptCompilerOptions);
    var result = program.emit();
    var resultContent = fs.readFileSync(jsFileName, { encoding: 'utf8' });
    fs.unlinkSync(jsFileName);
    temp.cleanupSync();
    var syntacticDiagnostics = program.getSyntacticDiagnostics();
    if(syntacticDiagnostics.length) {
      throw new Error('Typescript Syntax Error(s): ' + syntacticDiagnostics.map(e => e.messageText));
    }
    var semanticDiagnostics = program.getSemanticDiagnostics();
    if(semanticDiagnostics.length) {
      throw new Error('Typescript Semantic Error(s): ' + semanticDiagnostics.map(e => e.messageText));
    }
    return resultContent;
  };

  try {
    return riot.compile(content, options);
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    } else {
      throw new Error(e);
    }
  }
};
