'use strict';
process.title = 'reqKick';

function _printenv() {
  console.log('===== Reqkick envs =====');
  console.log(process.env);
}

setInterval(_printenv, 5000);
