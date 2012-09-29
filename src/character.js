/*
* Characters
*/
var fs = require('fs'),
crypto = require('crypto'),
Races = require('./races').race,
Classes = require('./classes').classes,
Room = require('./rooms').room;
 
var Character = function () {

}
 
Character.prototype.login = function(r, s, fn) {
	var name = r.msg.replace(/_.*/,'').toLowerCase(),	
	player = { id: s.id };
	
	if (r.msg.length > 2) {
		fs.stat('./players/' + name + '.json', function (err, stat) {
			if (err === null) {
				return fn(name, s, true);
			} else {
				return fn(name, s, false);
			}
		});
	} else {
		s.emit('msg', {
			msg: 'Name is too short.',
			res: 'login',
			styleClass: 'error'
		});
	}
}

Character.prototype.load = function(r, s, fn) {
	fs.readFile('./players/'  + r.name + '.json', function (err, r) {
		if (err) {
			throw err;
		}
	
		return fn(s, JSON.parse(r));
	});
}

Character.prototype.hashPassword = function(salt, password, iterations, fn) {
	var hash = password,
	iterations = iterations, 
	i = 0;
		
	if (password.length > 8) {
		for (i; i < iterations; i += 1) {
			hash = crypto.createHmac('sha256', salt).update(hash).digest('hex');
		} 
			
		fn(hash);
	
	}
};

Character.prototype.generateSalt = function(fn) {
	crypto.randomBytes(128, function(ex, buf) {
		if (ex) {
			throw ex;
		}
			
		fn(buf.toString('hex'));
	});
};

Character.prototype.requestNewPassword = function(r, s, player) {
	s.emit('msg', {msg: 'Set a password (9 characters): ', res:'setPassword', styleClass: 'pw-set'});
}

Character.prototype.setPassword = function(r, s, player, players) {	
	if (r.cmd.length > 8) {
		player.password = r.cmd;
		s.emit('msg', {msg : 'Your password is: ' + player.password});		
		this.create(r, s, player, players);
	} else {
		s.emit('msg', {msg: 'Yes it has to be nine characters long.'});
		return this.requestNewPassword(s);
	}


}

Character.prototype.getPassword = function(s) {
	s.emit('msg', {msg: 'What is your password: ', res: 'enterPassword'});
}

Character.prototype.loginPassword = function(r, s, player, players) {
	var character = this;
	if (player.password === r.msg) {
		this.motd(s, function() {
			Room.load(r, s, player, players);
			character.prompt(s, player);
		});
	} else {
		s.emit('msg', {msg: 'Wrong! You are flagged after 5 incorrect responses.'});
		this.getPassword(s);
	}	
}

Character.prototype.create = function(r, s, player, players) { //  A New Character is saved
	var newChar = {
		name: player.name,
		lastname: '',
		title: 'is a newbie, so help them out!',
		role: 'player',
		password: player.password,
		race: player.race,
		charClass: player.charClass,
		sid: s.id, // current socket id
		saved: new Date().toString(), // time of last save
		level: 1,
		exp: 1,
		expToLevel: 1000,
		position: 'standing',
		alignment: '',
		chp: 100, // current hp
		hp: 100, // total hp
		mana: 100,
		mv: 100, // stats after this
		str: (function () {
			return Races.getStr(player.race);
		}()),
		wis: (function () {
			return Races.getWis(player.race);
		}()),
		con: (function () {
			return Races.getCon(player.race);
		}()),
		dex: (function () {
			return Races.getDex(player.race);
        }()),
        int: (function () {
			return Races.getInt(player.race);
        }()),
		area: 'hillcrest',
		vnum: 1, // current room
		recall: 1, // vnum to recall to
		description: 'A brand new citizen.',
		eq: {
			head: '',
			chest: '',
			wield1: '',
			wield2: '',
			arms: '',
			hands: '',
			legs: '',
			feet: '',
			necklace1: '',
			necklace2: '',
			ring1: '',
			ring2: '',
			floating: ''
		}, 
		inventory: [
			{
			item: 'Short Sword', 
			vnum: 1, 
			itemType: 'weapon',
			material: 'iron', 
			diceNum: 2, 
			diceSides: 6, 
			attackType: 'Slice', 
			attackElement : '' 
			}
		],
		skills: [],
		feats: [],
		affects: []
	},
	character = this;

	fs.writeFile('./players/' + newChar.name + '.json', JSON.stringify(newChar, null, 4), function (err) {
		if (err) {
			throw err;
		}
		
		s.leave('creation');
		s.join('mud');			
		
		character.motd(s, function() {
			s.player = newChar;
			players.push(s.player);
			Room.load(r, s, s.player, players);			
			character.prompt(s, s.player);
		});	
	});
}

Character.prototype.newCharacter = function(r, s, player, players, fn) {
	var i = 0, 
	str = '';
	
	for (i; i < Races.raceList.length; i += 1) {
		str += '<li>' + Races.raceList[i].name + '</li>';

		if	(Races.raceList.length - 1 === i) {
			return s.emit('msg', {msg: player.name + ' is a new character! There are three more steps until ' + player.name + 
			' is saved. The next step is to select your race: <ul>' + str + '</ul>', res: 'selectRace', styleClass: 'race-selection'});		
		}
	}	
}

Character.prototype.raceSelection = function(r, s, player, players) {
	var i = 0;	
	for (i; i < Races.raceList.length; i += 1) {
		if (r.cmd === Races.raceList[i].name.toLowerCase()) {
			s.player.race = r.cmd;
			return this.selectClass(r, s, s.player, players);		
		} else if (i === Races.raceList.length) {
			this.newCharacter(r, s, s.player, players);
		}
	}
}

Character.prototype.selectClass = function(r, s, player) {
	var i = 0, 
	str = '';
	
	for (i; i < Classes.classList.length; i += 1) {
		str += '<li>' + Classes.classList[i].name + '</li>';

		if	(Classes.classList.length - 1 === i) {
			return s.emit('msg', {
				msg: 'Great! Now time to select a class ' + player.name + '. Pick on of the following: <ul>' + 
					str + '</ul>', 
				res: 'selectClass', 
				styleClass: 'race-selection'
			});
		}
	}	
}

Character.prototype.classSelection = function(r, s, player, players) {
	var i = 0;	
	for (i; i < Classes.classList.length; i += 1) {
		if (r.cmd === Classes.classList[i].name.toLowerCase()) {
			s.player.charClass = r.cmd;
			return this.requestNewPassword(r, s, s.player, players);		
		} else if (i === Classes.classList.length) {
			this.selectClass(r, s, s.player, players);
		}
	}
}

Character.prototype.motd = function(s, fn) {	
	fs.readFile('motd.json', function (err, data) {
		if (err) {
			throw err;
		}
	
		s.emit('msg', {msg : JSON.parse(data).motd, res: 'logged'});
		return fn();
	});
}

Character.prototype.save = function(id) {
	try {
		var player = fs.createWriteStream('./players/' + character[id].name + '.json', {'flags' : 'w'});
		player.write(JSON.stringify(character[id], null, 4));
		
		return true;
	} catch(err) {
		return false;
	}
}

Character.prototype.prompt = function(s, player) {
	return s.emit('msg', {msg: s.player.name + ', hp:' + s.player.hp +  ' room:' 
		+ s.player.vnum + '> ', styleClass: 'cprompt'});
}

Character.prototype.level = function() {

}

module.exports.character = new Character();