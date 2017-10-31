'use strict';
var _ = require('underscore');
var util = require('util');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;

module.exports = function (opts, callback) {
  var who = util.format('%s|common|%s', global.who, 'poll');
  logger.info(who, 'Inside');

  if (_.isEmpty(opts.filePath))
    return callback(util.format('%s: %s', who, 'missing opts.filePath'), null);

  if (!_.isNumber(opts.intervalMS))
    return callback(
      util.format('%s: %s', who, 'expected number opts.intervalMS'),
      null
    );

  if (_.isEmpty(opts.content))
    return callback(util.format('%s: %s', who, 'missing opts.content'), null);

  var poll = new EventEmitter();
  poll.watch = function() {
    poll.interval = setInterval(function() {
      fs.readFile(opts.filePath, 'utf8',
        function (err, data) {
          if (err)
            logger.warn(who, 'Failed to read contents of file:',
              opts.filePath
            );
            else if (data.trim() === opts.content)
              poll.emit('match');
        }
      );
    }, opts.intervalMS);
  };

  poll.stop = function() {
    clearInterval(poll.interval);
  };

  // Watch by default.
  poll.watch();
  return callback(null, poll);
};
