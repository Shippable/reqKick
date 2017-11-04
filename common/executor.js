'use strict';

var fs = require('fs');
var util = require('util');
var async = require('async');
var exec = require('child_process').exec;
var path = require('path');

module.exports = function (callback) {
  var who = util.format('%s|common|%s', global.who, 'executor');
  logger.info(who, 'Inside');

  var bag = {
    who: who,
    reqKickScriptNames: null
  };

  async.series([
      _readScripts.bind(null, bag),
      _executeSteps.bind(null, bag),
      _setSuccessStatus.bind(null, bag),
      _setExecutorAsReqProc.bind(null, bag)
    ],
    function (err) {
      if (err)
        logger.error(who, 'Failed to process message with error:', err);
      else
        logger.info(who, 'Successfully processed message');

      callback(err);
    }
  );
};

function _readScripts(bag, next) {
  var who = bag.who + '|' + _readScripts.name;
  logger.verbose(who, 'Inside');

  fs.readFile(global.config.jobStepsPath, 'utf8',
    function (err, data) {
      if (err) {
        logger.error(
          util.format('%s: failed to read job steps: %s',
            who, err
          )
        );
      } else {
        bag.reqKickScriptNames = JSON.parse(data).reqKick;
        logger.verbose(
          util.format(who, 'Read scripts successfully',
            global.config.jobStatusPath
          )
        );
      }

      return next(err);
    }
  );
}

function _executeSteps(bag, next) {
  var who = bag.who + '|' + _executeSteps.name;
  logger.verbose(who, 'Inside');

  async.eachSeries(bag.reqKickScriptNames,
    function (scriptName, nextScriptName) {
      var execCmd = util.format('%s %s %s',
        global.config.reqExecBinPath,
        path.join(global.config.scriptsDir, scriptName),
        global.config.jobENVPath
      );

      exec(execCmd,
        function (err) {
          return nextScriptName(err);
        }
      );
    },
    function (err) {
      return next(err);
    }
  );
}

function _setSuccessStatus(bag, next) {
  var who = bag.who + '|' + _setSuccessStatus.name;
  logger.verbose(who, 'Inside');

  fs.writeFile(global.config.jobStatusPath, '4002',
    function (err) {
      if (err)
        logger.verbose(
          util.format('%s: failed to set status: %s',
            who, err
          )
        );
      else
        logger.verbose(
          util.format(who, 'Updated %s with status success',
            global.config.jobStatusPath
          )
        );

      return next(err);
    }
  );
}

function _setExecutorAsReqProc(bag, next) {
  var who = bag.who + '|' + _setExecutorAsReqProc.name;
  logger.verbose(who, 'Inside');

  fs.writeFile(global.config.jobWhoPath, 'reqProc\n',
    function (err) {
      if (err)
        logger.verbose(
          util.format('%s: failed to set executor: %s',
            who, err
          )
        );
      else
        logger.verbose(
          util.format(who, 'Updated %s with executor reqProc',
            global.config.jobWhoPath
          )
        );

      return next(err);
    }
  );
}
