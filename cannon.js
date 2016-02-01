function $(sel) {
	return document.querySelector(sel);
};

function loadImage(url) {
	return new Promise(function (resolve, reject) {
		var image = new Image();
		image.onload = function() {
			resolve(image);
		}

		image.src = url;
	});
}

var fireButton = $("#fire");

var canvas = $("#canvas");
var context = canvas.getContext("2d");
var width = canvas.width;
var height = canvas.height;

var g = -980;
var x = 200;
var y = height - 200;
var vx = 0;
var vy = 0;
var ax = 0;
var ay = 0;

var velocity = 800;
var launchAngle = 30;
var x_0 = 170;
var y_0 = height - 210;
var vx_0 = Math.cos(launchAngle * Math.PI / 180);
var vy_0 = -Math.sin(launchAngle * Math.PI / 180);
var ax_0 = 0;
var ay_0 = -g;

var launchAngleInput = $("#angle");
var launchAngleOut = $("#angle_out");
launchAngleOut.innerHTML = launchAngle;
launchAngleInput.value = launchAngle;
launchAngleInput.oninput = function(evt) {
	launchAngle = evt.target.valueAsNumber;
	launchAngleOut.innerHTML = launchAngle;
};

var velocityInput = $("#velocity");
var velocityOut = $("#velocity_out");
velocityOut.innerHTML = velocity;
velocityInput.value = velocity;
velocityInput.oninput = function(evt) {
	velocity = evt.target.valueAsNumber;
	velocityOut.innerHTML = velocity;
};

var gravityInput = $("#gravity");
var gravityOut = $("#gravity_out");
gravityOut.innerHTML = g;
gravityInput.value = -g;
gravityInput.oninput = function(evt) {
	g = -evt.target.valueAsNumber;
	gravityOut.innerHTML = g;
};

var bullet = null;
var bullets = [];

Promise.all([
	loadImage("images/cannon_base.png"),
	loadImage("images/cannon_body.png"),
	loadImage("images/nate_shirt_iso.png")
]).then(function(images) {
	var cannonBase = images[0];
	var cannonBody = images[1];
	var projectile = images[2];

	var baseAspect = 1.65;
	var bodyAspect = 1.475;
	var heightRatio = 1.22;

	var baseHeight = 150;

	var attachPointY = height - baseHeight;
	var attachPointX = baseHeight * baseAspect * 0.5;

	function drawBody() {
		var baseAngle = 30;
		var effectiveAngle = Math.PI / 180 * (launchAngle - baseAngle);

		var bodyWidth = baseHeight * bodyAspect * heightRatio;
		var bodyHeight = baseHeight * heightRatio;

		var launchAngleRad = Math.PI / 180 * launchAngle;
		x_0 = attachPointX + Math.cos(launchAngleRad) * (bodyWidth - 20) - 25;
		y_0 = attachPointY - Math.sin(launchAngleRad) * (bodyHeight + 20) - 25;

		context.save();
		context.translate(attachPointX, attachPointY);
		context.rotate(-effectiveAngle);
		context.translate(-65, -173);
		context.drawImage(cannonBody, 0, 0, bodyWidth, bodyHeight);
		context.restore();
	}

	function fire() {
		bullets.push({
			x: x_0 - 25,
			y: y_0 - 25,
			vx: Math.cos(launchAngle * Math.PI / 180) * velocity,
			vy: -Math.sin(launchAngle * Math.PI / 180) * velocity
		});
	};

	fireButton.onclick = fire;
	var spaceDown = false;
	document.onkeydown = function (evt) { 
		if (evt.keyCode !== 32) {
			return;
		}

		spaceDown = true;
	};
	document.onkeyup = function (evt) {
		if (evt.keyCode !== 32) {
			return;
		}

		spaceDown = false;
	};

	var previousTime = 0;
	function gameLoop(time) {
		if (spaceDown) {
			fire();
		}

		window.requestAnimationFrame(gameLoop);

		context.clearRect(0, 0, canvas.width, canvas.height);

		drawBody();
		context.drawImage(cannonBase, 0, height - baseHeight, baseHeight * baseAspect, baseHeight);

		var dt = time - previousTime;
		previousTime = time;

		if (bullets.length === 0) {
			return;
		}

		var toRemove = [];
		bullets.forEach(function integrate(bullet, idx) {
			var x = bullet.x;
			var y = bullet.y;
			var vx = bullet.vx;
			var vy = bullet.vy;
			var ax = 0;
			var ay = -g;

			var ds = dt / 1000;
			x = x + vx * ds;
			y = y + vy * ds;

			vx = vx + ax * ds;
			vy = vy + ay * ds;

			context.drawImage(projectile, x, y, 50, 50);

			if (y > height - 50) {
				vy = -vy * 0.8;
				y = height - 51;
			}

			if (x > width || (Math.sqrt(vx * vx + vy * vy) < 0.5)) {
				toRemove.push(idx);
			}

			bullet.x = x;
			bullet.y = y;
			bullet.vx = vx;
			bullet.vy = vy;
		});

		toRemove.forEach(function splice(idx) {
			bullets.splice(idx, 1);
		});
		
	};

	window.requestAnimationFrame(gameLoop);
});