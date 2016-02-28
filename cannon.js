var fireButton = document.getElementById("fire");
var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");

// The width of the drawing area
var WIDTH = canvas.width;

// The height of the drawing area
var HEIGHT = canvas.height;

// The position of the cannon on the screen
var cannonX = 170;
var cannonY = HEIGHT - 210;

// The values we can manipulate with the slider inputs
var gravity = -980;
var velocity = 800;
var launchAngle = 30;


/**
 * Load an image from a url with a promise.
 * More information on promises for the very curious here:
 * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise
 * @param {String} url
 */
function loadImage(url) {
	return new Promise(function fetchImage(resolve, reject) {
		var image = new Image();
		image.onload = function imageLoaded() {
			resolve(image);
		}
		image.src = url;
	});
}

/**
 * Connects the launch angle slider to the actual launch angle.
 * Also keeps the launch angle label up to date.
 */
var launchAngleInput = document.getElementById("angle");
var launchAngleOut = document.getElementById("angle_out");
launchAngleOut.innerHTML = launchAngle;
launchAngleInput.value = launchAngle;
launchAngleInput.oninput = function onLaunchAngleChanged(inputEvent) {
	launchAngle = inputEvent.target.valueAsNumber;
	launchAngleOut.innerHTML = launchAngle;
};

/**
 * Connects the velocity slider to the actual velocity.
 * Also keeps the velocity label up to date.
 */
var velocityInput = document.getElementById("velocity");
var velocityOut = document.getElementById("velocity_out");
velocityOut.innerHTML = velocity / 100;
velocityInput.value = velocity;
velocityInput.oninput = function onVelocityChanged(inputEvent) {
	velocity = inputEvent.target.valueAsNumber;
	velocityOut.innerHTML = velocity / 100;
};

/**
 * Connects the gravity slider to the actual gravity.
 * Also keeps the gravity label up to date.
 */
var gravityInput = document.getElementById("gravity");
var gravityOut = document.getElementById("gravity_out");
gravityOut.innerHTML = gravity / 100;
gravityInput.value = -gravity;
gravityInput.oninput = function onGravityChanged(inputEvent) {
	gravity = -inputEvent.target.valueAsNumber;
	gravityOut.innerHTML = gravity / 100;
};


var projectile = null;
var bullets = [];

/**
 * The game doesn't work very well until all of the art is loaded
 * We wait to set up the game and assign the gameplay functions until the images are loaded.
 */
Promise.all([
	loadImage("images/cannon_base.png"),
	loadImage("images/cannon_body.png"),
	loadImage("images/vikingball.png")
]).then(function allImagesLoaded(images) {
	var cannonBase = images[0];
	var cannonBody = images[1];
	projectile = images[2];

	var baseAspect = 1.65;
	var bodyAspect = 1.475;
	var heightRatio = 1.22;

	var baseHeight = 150;

	var attachPointY = HEIGHT - baseHeight;
	var attachPointX = baseHeight * baseAspect * 0.5;

	setupDropZone();

	function drawBody() {
		var baseAngle = 30;
		var effectiveAngle = Math.PI / 180 * (launchAngle - baseAngle);

		var bodyWidth = baseHeight * bodyAspect * heightRatio;
		var bodyHeight = baseHeight * heightRatio;

		var launchAngleRad = Math.PI / 180 * launchAngle;
		cannonX = attachPointX + Math.cos(launchAngleRad) * (bodyWidth - 20) - 25;
		cannonY = attachPointY - Math.sin(launchAngleRad) * (bodyHeight + 20) - 25;

		context.save();
		context.translate(attachPointX, attachPointY);
		context.rotate(-effectiveAngle);
		context.translate(-65, -173);
		context.drawImage(cannonBody, 0, 0, bodyWidth, bodyHeight);
		context.restore();
	}

	function fire() {
		bullets.unshift({
			x: cannonX - 25,
			y: cannonY - 25,
			vx: Math.cos(launchAngle * Math.PI / 180) * velocity,
			vy: -Math.sin(launchAngle * Math.PI / 180) * velocity,
			lifetime: 15000
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

		context.clearRect(0, 0, WIDTH, HEIGHT);

		drawBody();
		context.drawImage(cannonBase, 0, HEIGHT - baseHeight, baseHeight * baseAspect, baseHeight);

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
			var ay = -gravity;

			var remainingLifetime = bullet.lifetime - dt;
			if (remainingLifetime <= 0) {
				toRemove.push(idx);
			}
			bullet.lifetime = remainingLifetime;

			var ds = dt / 1000;
			x = x + vx * ds;
			y = y + vy * ds;

			vx = vx + ax * ds;
			vy = vy + ay * ds;

			context.drawImage(projectile, x, y, 50, 50);

			if (y > HEIGHT - 50) {
				vy = -vy * 0.8;
				y = HEIGHT - 51;
			}

			if (x > WIDTH || (Math.sqrt(vx * vx + vy * vy) < 0.5)) {
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

var dropZoneElement = document.getElementById("projectile_image");
function setupDropZone() {
	dropZoneElement.ondragover = function(event) {
		event.stopPropagation();
		event.preventDefault();

		dropZoneElement.style.background = "green";
	};

	dropZoneElement.ondrop = function(event) {
		event.stopPropagation();
		event.preventDefault();

		var dataTransfer = event.dataTransfer;
		var files = dataTransfer.files;
		if (0 === files.length) {
			dropZoneElement.style.background = "transparent";
			return;
		}

		var file = files[0];
		var fileReader = new FileReader();
		fileReader.onload = function (evt) {
			var result = evt.target.result;
			loadImage(result)
				.then(function replaceProjectile(img) {
					projectile = img;
					dropZoneElement.src = result;
				});
		};
		fileReader.readAsDataURL(file);

		dropZoneElement.style.background = "transparent";
	};

	dropZoneElement.ondragleave = function(event) {
		event.stopPropagation();
		event.preventDefault();
		
		dropZoneElement.style.background = "transparent";
	};
}
