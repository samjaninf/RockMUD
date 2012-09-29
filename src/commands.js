var dice = require('./dice'),
Character = require('./character').character,
Room = require('./rooms').room;

var Cmd = function () {
	this.perms = ['admin'];
};

Cmd.prototype.parse = function(r, s, player, players) {
	r.cmd = r.msg.replace(/_.*/, '');
	r.msg = r.msg.replace(/^.*?_/, '').replace(/_/g, ' ');
	r.emit = 'msg';
						
	if (r.res in Character || r.cmd in Character) {
		return Character[r.res](r, s, player, players);
	} else if (r.cmd in this) {
		return this[r.cmd](r, s, player, players);
	} else if (r.cmd in Room) {
		return Room[r.cmd](r, s, player, players);	
	} else {
		return Character.prompt(s, player);
	}
}

Cmd.prototype.save = function(r, s) {
	if (Character.save(s.id)) {
		return s.emit('msg', {msg: 'Saved!.'});
	} else {
		return s.emit('msg', {msg: 'Save failed.'});
	}
}

Cmd.prototype.removePlayer = function(s) {
	var i = 0;
	for (i; i < cmds.players.length; i += 1) {
		if (Character[s.id].name === cmds.players[i].name) {
			if (i === 0) {
				cmds.players = [];
			} else {
				cmds.players[i] = null;
				cmds.players.splice(i, 1);
			}
		}	
	}	
};

/*
* Channels
*/
Cmd.prototype.say = function(r, s) {

};

Cmd.prototype.look = function(r, s, player, players) {
	Room.load(r, s, player, players, function(room) {
		return Character.prompt(s, player);
	});
}

Cmd.prototype.chat = function(r, s, player) {
	var msg = r.msg;
		
	r.msg = 'You chat> ' + msg;
	r.styleClass = 'msg';
		
	s.emit('msg', r);
		
	r.msg = '';
	r.msg = player.name + '> ' + msg;
		
	s.in('mud').broadcast.emit('msg', r);

	return Character.prompt(s, player);
};

// Example of a command requiring certain permissions
Cmd.prototype.achat = function(r, s, player) { 
	if (this.perms.indexOf(player.role) != -1) {
		var msg = r.msg;
		r.msg = 'You admin chat> ' + msg;
		r.styleClass = 'msg';
	
		s.emit('msg', r);
		r.msg = '';
	    r.msg = 'The Great Oracle> ' + msg;
		
		return s.broadcast.emit('msg', r);
	} else {
		r.msg = 'You do not have permission to execute this command.';
		s.emit('msg', r);		
		
		return Character.prompt(s, player);
	}
};

Cmd.prototype.flame = function(r, s) { 

};

Cmd.prototype.kill = function(r, s, player, players) {
	r.msg = '<div class="cmd-kill">' +
		'You slash a wolf with <div class="hit">***UNRELENTING***</div> force.</div>';
    r.styleClass = 'cbt';
	
	s.emit('msg', r);

	return Character.prompt(s, player);
};

Cmd.prototype.changes = function(r, s, player) {
   	return Character.prompt(s, player);
};

Cmd.prototype.where = function(r, s) {
	r.msg = '<ul>' + 
	'<li>Your Name: ' + Character[s.id].name + '</li>' +
	'<li>Current Area: ' + Character[s.id].area + '</li>' +
	'<li>Room Number: ' + Character[s.id].vnum + '</li>'  +
	'</ul>';	
	r.styleClass = 'playerinfo cmd-where';
	
	s.emit('msg', r);
	
	return Character.prompt(s, player);
};

Cmd.prototype.who = function(r, s, player, players) {
	s.emit('msg', {
		msg: (function () {
			var str = '',
			i = 0;
			
			if (players.length > 0) {
				for (i; i < players.length; i += 1) {	

					
				
					str += '<li>' + players[i].name[0].toUpperCase() + 
					players[i].name.slice(1) + 
					' a level ' + players[i].level   +
					' ' + players[i].race + 
					' ' + players[i].charClass +  
					'</li>';
					
					
					if (i === players.length - 1) {
						return '<h1>Currently logged on</h1><ul>' +
						'<li>*******Players Online******</li>' +
						str +
						'<li>***************************</li>' + 
						'</ul>'; 
					}
					
				}
			} else {
				str = '<li>No one is online.</li>';
					return '<h1>Currently logged on</h1><ul>' +
					'<li>*******Players Online******</li>' +
					str +
				'<li>***************************</li>' + 
				'</ul>'; 
			}
			
			
				
		}()), styleClass: 'who-cmd'
	});
	
	return Character.prompt(s, player);
}

module.exports.cmds = new Cmd();