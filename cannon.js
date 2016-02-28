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

// The variables for the projectiles
var projectileImage = null;
var activeProjectiles = [];


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
	projectileImage = images[2];

	// Determine where to draw the cannon parts
	var baseAspect = 1.65;
	var bodyAspect = 1.475;
	var heightRatio = 1.22;
	var baseHeight = 150;
	var attachPointY = HEIGHT - baseHeight;
	var attachPointX = baseHeight * baseAspect * 0.5;

	setupDropZone();

	/**
	 * Draw the body (barrel) of the cannon
	 */
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

	/**
	 * Fire the cannon!
	 */
	function fire() {
		activeProjectiles.unshift({
			x: cannonX - 25,
			y: cannonY - 25,
			velocityX: Math.cos(launchAngle * Math.PI / 180) * velocity,
			velocityY: -Math.sin(launchAngle * Math.PI / 180) * velocity,
			lifetime: 15
		});
	};
	fireButton.onclick = fire;

	/**
	 * Keep track of the spacebar's state.
	 * We want to know when it's pressed and when it isn't.
	 */
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

	/**
	 * Core game loop
	 * Everything in the game is based on time 
	 * (the projectile formulas have 't' in them and this stands for time)
	 * @param {Number} millisecondTime - The time in milliseconds.
	 */
	var previousTime = 0;
	function gameLoop(millisecondTime) {
		if (spaceDown) {
			fire();
		}

		// This asks the browser for the next time it has time to do computations
		window.requestAnimationFrame(gameLoop);

		context.clearRect(0, 0, WIDTH, HEIGHT);

		drawBody();
		context.drawImage(cannonBase, 0, HEIGHT - baseHeight, baseHeight * baseAspect, baseHeight);

		// Keep track of how much time has passed since the last time the game loop happened.
		var elapsedSeconds = (millisecondTime - previousTime) / 1000;
		previousTime = millisecondTime;

		if (activeProjectiles.length === 0) {
			return;
		}

		var toRemove = [];
		 // Process all of the movement for each of the active projectiles
		activeProjectiles.forEach(function integrate(projectile, idx) {
			var x = projectile.x;
			var y = projectile.y;
			var velocityX = projectile.velocityX;
			var velocityY = projectile.velocityY;
			var accelerationX = 0;
			var accelerationY = -gravity;

			// Make sure that projectiles that have existed longer than their lifespan get cleaned up
			var remainingLifetime = projectile.lifetime - elapsedSeconds;
			if (remainingLifetime <= 0) {
				toRemove.push(idx);
			}
			projectile.lifetime = remainingLifetime;

			x = x + velocityX * elapsedSeconds;
			y = y + velocityY * elapsedSeconds;

			velocityX = velocityX + accelerationX * elapsedSeconds;
			velocityY = velocityY + accelerationY * elapsedSeconds;

			context.drawImage(projectileImage, x, y, 50, 50);

			// Make balls bounce when they hit the floor
			if (y > HEIGHT - 50) {
				velocityY = -velocityY * 0.8;
				y = HEIGHT - 51;
			}

			if (x > WIDTH || (Math.sqrt(velocityX * velocityX + velocityY * velocityY) < 0.5)) {
				toRemove.push(idx);
			}

			projectile.x = x;
			projectile.y = y;
			projectile.velocityX = velocityX;
			projectile.velocityY = velocityY;
		});

		// Remove all of the projectiles that have finished their lifespan
		toRemove.forEach(function splice(idx) {
			activeProjectiles.splice(idx, 1);
		});
		
	};

	// This asks the browser for the next time it has time to do computations
	window.requestAnimationFrame(gameLoop);
});

/**
 * Allow the user to drag their own images into the image box to use as projectiles.
 */
var dropZoneElement = document.getElementById("projectile_image");
function setupDropZone() {
	/**
	 * Prompt the user that dragging their own image over the box is allowed
	 */
	dropZoneElement.ondragover = function onImageDragOver(event) {
		// Stop the automatic javascript functions to replace them with our own.
		event.stopPropagation();
		event.preventDefault();

		// Indicate the user can do this by highlighting it green.
		dropZoneElement.style.background = "green";
	};

	/**
	 * Handle changing the image if they drop the image on the box
	 */
	dropZoneElement.ondrop = function onImageDrop(event) {
		// Stop the automatic javascript functions to replace them with our own.
		event.stopPropagation();
		event.preventDefault();

		// Check for files being dragged
		var dataTransfer = event.dataTransfer;
		var files = dataTransfer.files;
		if (0 === files.length) {
			dropZoneElement.style.background = "transparent";
			return;
		}

		// Load the file
		var file = files[0];
		var fileReader = new FileReader();
		fileReader.onload = function onFileLoaded(fileLoadEvent) {
			var result = fileLoadEvent.target.result;
			loadImage(result)
				.then(function replaceProjectile(img) {
					projectileImage = img;
					dropZoneElement.src = result;
				});
		};
		fileReader.readAsDataURL(file);

		dropZoneElement.style.background = "transparent";
	};

	/**
	 * Change the drag and drop hint when they stop dragging over the box
	 */
	dropZoneElement.ondragleave = function onDragLeave(event) {
		// Stop the automatic javascript functions to replace them with our own.
		event.stopPropagation();
		event.preventDefault();
		
		dropZoneElement.style.background = "transparent";
	};
}
