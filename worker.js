'use strict';

var poller = require('./common/poller.js');
var executor = require('./common/executor.js');
var util = require('util');

module.exports = function () {
  var who = util.format('%s|%s', global.who, 'worker');
  logger.verbose(who, 'Inside');

  // Immediately check hand-off in case the service restarts.
  var opts = {
    filePath: global.config.jobWhoPath,
    intervalMS: global.config.pollIntervalMS,
    content: 'reqKick'
  };

  poller(opts,
    function (err, handoffPoll) {
      if (err) {
        logger.warn('Failed to setup poller:', err);
      }

      handoffPoll.on('match', function () {
        logger.verbose(who, 'Handoff received. Stopping poll and executing.');
        handoffPoll.stop();
        executor(
          function () {
            handoffPoll.watch();
            logger.verbose(who,
              'Execution complete. Polling again.'
            );
          }
        );
      }
    );
  });
};
