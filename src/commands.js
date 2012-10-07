var dice = require('./dice'),
Character = require('./character').character,
Room = require('./rooms').room;

var Cmd = function () {
	this.perms = ['admin'];
};

/*
* Channels
*/
Cmd.prototype.say = function(r, s, players) {

};

Cmd.prototype.look = function(r, s, players) {
	Room.getRoom(r, s, players, function(room) {
		return Character.prompt(s);
	});
}

Cmd.prototype.chat = function(r, s) {
	var msg = r.msg;
		
	r.msg = 'You chat> ' + msg;
	r.styleClass = 'msg';
		
	s.emit('msg', r);
		
	r.msg = '';
	r.msg = s.player.name + '> ' + msg;
		
	s.in('mud').broadcast.emit('msg', r);

	return Character.prompt(s);
};

// Example of a command requiring certain permissions
Cmd.prototype.achat = function(r, s) { 
	if (this.perms.indexOf(s.player.role) != -1) {
		var msg = r.msg;
		r.msg = 'You admin chat> ' + msg;
		r.styleClass = 'admin-msg';
	
		s.emit('msg', r);
		r.msg = '';
	    r.msg = 'A great voice> ' + msg;
		
		return s.broadcast.emit('msg', r);
	} else {
		r.msg = 'You do not have permission to execute this command.';
		s.emit('msg', r);		
		
		return Character.prompt(s);
	}
};

Cmd.prototype.flame = function(r, s) { 

};

Cmd.prototype.kill = function(r, s, players) {
	r.msg = 'You slash a wolf with <div class="hit">***UNRELENTING***</div> force.';
    r.styleClass = 'cbt';
	
	s.emit('msg', r);

	return Character.prompt(s);
};

Cmd.prototype.where = function(r, s) {
	r.msg = '<ul>' + 
	'<li>Your Name: ' + Character[s.id].name + '</li>' +
	'<li>Current Area: ' + Character[s.id].area + '</li>' +
	'<li>Room Number: ' + Character[s.id].vnum + '</li>'  +
	'</ul>';	
	r.styleClass = 'playerinfo cmd-where';
	
	s.emit('msg', r);
	
	return Character.prompt(s);
};

Cmd.prototype.who = function(r, s, players) {
	s.emit('msg', {
		msg: (function () {
			var str = '',
			i = 0;
			
			if (players.length > 0) {
				for (i; i < players.length; i += 1) {				
					str += '<li>' + players[i].name[0].toUpperCase() + 
					players[i].name.slice(1) + ' ' +
					(function() {
						if (players[i].title === '') {
							return 'a level ' + players[i].level   +
							' ' + players[i].race + 
							' ' + players[i].charClass; 
						} else {
							return players[i].title;
						}
					
					}()) +
					' (' + players[i].role + ')'
					
					'</li>';					
					
					if (i === players.length - 1) {
						return '<h1>Currently logged on</h1><ul>' +
						str +
						'</ul>'; 
					}
					
				}
			} else {
				str = '<li>No one is online.</li>';
					return '<h1>Currently logged on</h1><ul>' +
					str +
				'</ul>'; 
			}				
		}()), styleClass: 'who-cmd'
	});
	
	return Character.prompt(s);
}

Cmd.prototype.save = function(r, s, players) {
	Character.save(s, function() {
		s.emit('msg', {msg: s.player.name + ' was saved!', styleClass: 'save'});
		return Character.prompt(s);
	});
}

Cmd.prototype.title = function(r, s, players) {
	if (r.msg.length < 40) {
		s.player.title = r.msg;
		Character.save(s, function() {
			s.emit('msg', {msg: 'Your title was changed!', styleClass: 'save'})
			return Character.prompt(s);
		});
	} else {
		s.emit('msg', {msg: s.player.name + ' was saved!', styleClass: 'save'});
		return Character.prompt(s);
	}
}

// View equipment
Cmd.prototype.eq = function() {

}

Cmd.prototype.score = function(r, s, players) { 
	var score = '<div class="name">' + s.player.name + ' <div class="title">' + s.player.title + '</div></div>' +
	'<ul class="stats">' + 
		'<li>HP: ' + s.player.chp + '/' + s.player.hp +'</li>' +
		'<li>STR ' + s.player.str + '</li>' +
		'<li>WIS ' + s.player.wis + '</li>' +
		'<li>INT ' + s.player.int + '</li>' +
		'<li>DEX ' + s.player.dex + '</li>' +
		'<li>CON ' + s.player.con + '</li>' +
		'<li>Hunger: ' + s.player.hunger + '</li>' +
		'<li>Thirst: ' + s.player.thirst + '</li>' +
	'</ul>';
	
	s.emit('msg', {msg: score, styleClass: 'score' });
	return Character.prompt(s);
}

module.exports.cmd = new Cmd();