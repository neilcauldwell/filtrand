
exports.isTrackableChannel = function(name) {
  return name.indexOf('presence-') != 0 && 
    name.indexOf('private-') != 0 &&
    name != 'subjects';
};


exports.subjectToChannel = function(subject) {
	subject = subject.replace(/^#/, "");
  return encodeURIComponent(subject).replace('-', '-0')
    .replace('.', '-2').replace('!', '-3').replace('~', '-4').replace('*', '-5')
    .replace('(', '-6').replace(')', '-7')
};

exports.channelToSubject = function(channel) {
	channel = ("#"+channel);
  return decodeURI(channel.replace('-7', ')').replace('-6', '(').replace('-5', '*')
                   .replace('-4', '~').replace('-3', '!').replace('-2', '.')
                   .replace('-0', '-'));
};
