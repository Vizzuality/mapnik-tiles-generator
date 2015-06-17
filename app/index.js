'use strict';

var _ = require('underscore');
var handlebars = require('handlebars');
var fs = require('fs');
var carto = require('carto');
var colors = require('colors');
var mapnikOmnivore = require('mapnik-omnivore');
var PythonShell = require('python-shell');
var templatePath = process.cwd() + '/app/template.handlebars';

// Defaults settings
var DEFAULTS = {
  dest: './tiles',
  threads: 2,
  format: 'png256'
};

// Parsing command line options
var params = process.argv.slice(2);
var options = {};

for (var p = params.length; p--;) {
  var item = params[p].split('=');
  options[item[0]] = item[1];
}

options = _.extend(DEFAULTS, options);

console.log(options);

console.info('Starting...'.cyan);

// Checking options
var errors = [];

if (!options.file) {
  errors.push('* file path not specified. Use file=/path/example.png');
}

if (!options.styles) {
  errors.push('* styles path not specified. ' +
    'Use styles=/path/example.mss (CartoCSS)');
}

if (!options.min_zoom || !options.max_zoom) {
  errors.push('* min_zoom or max_zoom are not specified. ' +
    'Use min_zoom=1 and max_zoom=10');
}

// Interrupt if there aren't enought params
if (errors.length) {
  console.error('Interrupted! Posible causes:'.red);
  return _.each(errors, function(message) {
    console.error(message.red);
  });
}

// Reading styles
console.info('Reading styles...'.cyan);
fs.readFile(options.styles, 'utf-8', function(err, styles) {

  if (err) { throw err; }

  styles = new carto.Renderer({}).renderMSS(styles);

  // Reading file
  console.info('Reading file...'.cyan);
  mapnikOmnivore.digest(options.file, function(err, metadata) {

    if (err) { throw err; }

    fs.readFile(templatePath, 'utf-8', function(err, templateString) {

      if (err) { throw err; }

      var template = handlebars.compile(templateString);
      var xml = template({
        styles: styles,
        tif: options.file,
        srs: metadata.projection
      });
      var xmlPath = process.cwd() + '/tmp/osm.xml';

      // Generating XML for tiles
      fs.writeFile(xmlPath, xml, function(err) {

        if (err) { throw err; }

        console.log([
            '--bbox', metadata.extent[0], metadata.extent[1],
              metadata.extent[2], metadata.extent[3],
            '--style', xmlPath,
            '--zooms', options['min_zoom'], options['max_zoom'],
            '--tiledir', options.dest,
            '--threads', options.threads,
            '--format', options.format
          ]);

        // Generating tiles
        console.info('Generating tiles...'.cyan);
        PythonShell.run('./app/polytiles.py', {
          pythonPath: process.cwd() + '/env/bin/python',
          scriptPath: process.cwd(),
          args: [
            '--bbox', metadata.extent[0], metadata.extent[1],
              metadata.extent[2], metadata.extent[3],
            '--style', xmlPath,
            '--zooms', options['min_zoom'], options['max_zoom'],
            '--tiledir', options.dest,
            '--threads', options.threads,
            '--format', options.format
          ]
        }, function (err, results) {
          if (err) { throw err; }

          console.info(results);

          // When finished show a message
          console.info('Finished correctly!'.green);
        });

      });

    });

  });

});
