'use strict';

var fs = require('fs');
var util = require('util');
var async = require('async');

module.exports = function (callback) {
  var who = util.format('%s|common|%s', global.who, 'executor');
  logger.info(who, 'Inside');

  var bag = {
    who: who
  };

  async.series([
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

function _setSuccessStatus(bag, next) {
  var who = bag.who + '|' + _setSuccessStatus.name;
  logger.verbose(who, 'Inside');

  fs.writeFile(global.config.jobStatusPath, '4002',
    function (err) {
      if (err)
        logger.warn(who, 'Failed to update status with error: ', err);

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
        logger.warn(who, 'Failed to update job who with error: ', err);

      return next(err);
    }
  );
}
