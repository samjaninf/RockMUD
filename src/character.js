/*
* Characters.js controls everything dealing with a character.json file, no in game commands are
* defined here. Commands.js does share some of these method names, as they -- are --  commands. See: save().
*/
var fs = require('fs'),
crypto = require('crypto'),
Races = require('./races').race,
Classes = require('./classes').classes,
Room = require('./rooms').room,
Dice = require('./dice').roller;
 
var Character = function () {
	this.perms = [];
}
 
Character.prototype.login = function(r, s, fn) {
	var name = r.msg.replace(/_.*/,'').toLowerCase();	
	
	if (r.msg.length > 2 ) {
		if  (/[`~!@#$%^&*()-+={}[]]|[0-9]/g.test(r.msg) === false) {
			fs.stat('./players/' + name + '.json', function (err, stat) {
				if (err === null) {
					return fn(name, s, true);
				} else {
					return fn(name, s, false);
				}
			});
		} else {
			return s.emit('msg', {msg : 'Enter your name:', res: 'login', styleClass: 'enter-name'});
		}
	} else {
		s.emit('msg', {
			msg: 'Invalid name choice, must be more than two characters.',
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
		
		s.player = JSON.parse(r);
		
		return fn(s);
	});
}

Character.prototype.hashPassword = function(salt, password, iterations, fn) {
	var hash = password,
	iterations = iterations, 
	i = 0;
		
	if (password.length > 7) {
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

Character.prototype.getPassword = function(s, players, fn) {
	var character = this;
	s.emit('msg', {msg: 'What is your password: ', res: 'enterPassword'});

	s.on('password', function (r) { 
		character.hashPassword(s.player.salt, r.msg, 1000, function(hash) {
			if (s.player.password === hash) {
				players.push(s.player);
					
				character.motd(s, function() {		
					Room.getRoom(r, s, players, function() {
						fn(s);
						character.prompt(s);
					});					
				});
			} else {
				s.emit('msg', {msg: 'Wrong! You are flagged after 5 incorrect responses.'});
				character.getPassword(s);
			}
		});
	});
}

Character.prototype.create = function(r, s, players, fn) { //  A New Character is saved]
	s.player = {
		name: s.player.name,
		lastname: '',
		title: '',
		role: 'player',
		password: s.player.password,
		salt: '',
		race: s.player.race,
		charClass: s.player.charClass,
		created: new Date().toString(), // time of creation
		level: 1,
		exp: 1,
		expToLevel: 1000,
		position: 'standing',
		alignment: '',
		chp: 100, // current hp
		hp: 100, // total hp
		mana: 100,
		mv: 100, // stats after this
		str: 12,
		wis: 12,
		int: 12,
		dex: 12,
		con: 12,
		hunger: 0,
		thirst: 0,
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
			attackElement : '',
			flags: []
			}
		],
		skills: [],
		feats: [],
		affects: []
	},
	character = this;
	
	character.rollStats(s.player, function(player) {
		s.player = player;
	
		character.generateSalt(function(salt) {
			s.player.salt = salt;
			character.hashPassword(salt, s.player.password, 1000, function(hash) {
				s.player.password = hash;
				fs.writeFile('./players/' + s.player.name + '.json', JSON.stringify(s.player, null, 4), function (err) {
					var i = 0;
		
					if (err) {
						throw err;
					}
					
					for (i; i < players.length; i += 1) {
						if (players[i].sid === s.id) {
							players.splice(i, 1);
						}
					}
		
					s.leave('creation');
					s.join('mud');			
					players.push(s.player);
					
					character.motd(s, function() {
						fn(s);
						Room.getRoom(r, s, players);			
						character.prompt(s);
					});	
				});	
			});
		});	
	});
}

// Rolling stats for a new character
Character.prototype.rollStats = function(player, fn) { 
	var i = 0,
	j = 0,
	racreKey, // property of the race defines in raceList
	classKey; // property of the class defines in classList

	for (i; i < Races.raceList.length; i += 1) {		// looking for race
		if (Races.raceList[i].name.toLowerCase() === player.race) {	 // found race
			delete Races.raceList[i].name;			
			for (var raceKey in player) {
				if (player[raceKey] in Races.raceList[i]) { // found, add in stat bonus						
					player[player[raceKey]] = player[player[raceKey]] + Races.raceList[i][player[raceKey]];	
				}
			}
		}		
				
		if (i === Races.raceList.length - 1) { // rolling stats is finished
			for (j; j < Classes.classList.length; j += 1) { // looking through classes
				if (Classes.classList[j].name.toLowerCase() === player.charClass) { // class match found
					delete Classes.classList[j].name; 

					for(classKey in player) {
						if(classKey in Classes.classList[j])
							player[classKey] = Classes.classList[j][classKey] + player[classKey];
					}
				}

				if (j === Classes.classList.length - 1) {					
					return fn(player);
				}
			}
		}
	}		
}

Character.prototype.hpRegen = function(s, fn) {
	var conMod = Math.ceil(s.player.con/4);
	Dice.roll(1, 8, function(total) {
		if (typeof fn === 'function') {
			fn(s.player.chp + total + conMod);
		} else {
			s.player.chp = s.player.chp + total + conMod;
		}
	});
}

Character.prototype.newCharacter = function(s, players, fn) {
	var character = this,
	i = 0, 
	str = '';
	
	for (i; i < Races.raceList.length; i += 1) {
		str += '<li>' + Races.raceList[i].name + '</li>';

		if	(Races.raceList.length - 1 === i) {
			s.emit('msg', {msg: s.player.name + ' is a new character! There are three more steps until ' + s.player.name + 
			' is saved. The next step is to select your race: <ul>' + str + '</ul>', res: 'selectRace', styleClass: 'race-selection'});		
	
			s.on('raceSelection', function (r) { 
				r.msg = r.msg.toLowerCase();
				
				character.raceSelection(r, function(fnd) {
					if (fnd) {
						i = 0;
						str = '';
						s.player.race = r.msg;
	
						for (i; i < Classes.classList.length; i += 1) {
							str += '<li>' + Classes.classList[i].name + '</li>';

							if	(Classes.classList.length - 1 === i) {
								s.emit('msg', {
									msg: 'Great! Now time to select a class ' + s.player.name + '. Pick on of the following: <ul>' + 
									str + '</ul>', 
									res: 'selectClass', 
									styleClass: 'race-selection'
								});
								
								s.on('classSelection', function(r) {
									r.msg = r.msg.toLowerCase();
			
									character.classSelection(r, function(fnd) {
										if (fnd) {
											s.player.charClass = r.msg;
											
											s.emit('msg', {
												msg: s.player.name + ' is a ' + s.player.charClass + '! There is 1 more step ' + s.player.name + 
												' is saved. Please define a password (8 characters):', 
												res: 'createPassword', 
												styleClass: 'race-selection'
											});	
								
											s.on('setPassword', function(r) {
												if(r.msg > 7) {
													s.player.password = r.msg;
													character.create(r, s, players, fn);
												} else {
													s.emit('msg', {msg: 'Password should be longer', styleClass: 'error' });
												}
											
											});
											
										} else {
											s.emit('msg', {msg: 'That class is not on the list, please try again', styleClass: 'error' });
										}									
									}); 
								});
							}
						}										
					} else {
						s.emit('msg', {msg: 'That race is not on the list, please try again', styleClass: 'error' });
					}
				});
			});			
		}
	}	
}

Character.prototype.raceSelection = function(r, fn) {
	var i = 0;
	
	for (i; i < Races.raceList.length; i += 1) {
		if (r.msg === Races.raceList[i].name.toLowerCase()) {
			return fn(true);
		} else if (i === Races.raceList.length) {
			return fn(false);
		}
	}
}


Character.prototype.classSelection = function(r, fn) {
	var i = 0;	
	
	for (i; i < Classes.classList.length; i += 1) {
		if (r.msg === Classes.classList[i].name.toLowerCase()) {
			return fn(true)
		} else if (i === Classes.classList.length) {
			return fn(false)
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

Character.prototype.save = function(s, fn) {
	s.player.saved = new Date().toString();
	
	fs.writeFile('./players/' + s.player.name.toLowerCase() + '.json', JSON.stringify(s.player, null, 4), function (err) {
		if (err) {
			return s.emit('msg', {msg: 'Error saving character.'});
		} else {
			if (typeof fn === 'function') {
				return fn();
			}	
		}
	});
}

Character.prototype.hunger = function(s) {
	var character = this;
	
	if (s.player.hunger < 10) {
		Dice.roll(1, 4, function(total) {
			if (total + s.player.con/4 < 5) { // Roll to reduce hunger pangs, CON?
				s.player.hunger = s.player.hunger + 1;
			}			
						
			if (s.player.hunger >= 5) {	
				if (total < 3) {
					s.player.chp = s.player.chp - 1;
				}
			
				s.emit('msg', {msg: 'You are hungry.', styleClass: 'hunger'});

				return character.prompt(s);
			}
		});
	} else {
		s.emit('msg', {msg: 'You are dying of hunger.', styleClass: 'hunger'});
		return character.prompt(s);
	}
}

Character.prototype.thirst = function(s) {
	var character = this;
	
	if (s.player.thirst < 10) {
		Dice.roll(1, 4, function(total) {
			if (total + s.player.con/4 < 5) { // Roll to reduce hunger pangs, CON?
				s.player.thirst = s.player.thirst + 1;
			}			
						
			if (s.player.thirst >= 5) {		

				if (total < 3) {
					s.player.chp = s.player.chp - 1;
				}
			
				s.emit('msg', {msg: 'You are Thirsty.', styleClass: 'hunger'});

				return character.prompt(s);
			}
		});
	} else {
		s.emit('msg', {msg: 'You need to find somethig to drink.', styleClass: 'hunger'});
		return character.prompt(s);
	}
}

Character.prototype.prompt = function(s) {
	return s.emit('msg', {msg: s.player.name + ', hp:' + s.player.chp +  ' room:' 
		+ s.player.vnum + '> ', styleClass: 'cprompt'});
}

Character.prototype.level = function() {

}

module.exports.character = new Character();