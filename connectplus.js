/* Gets a weighted random integer between 0 and the length of a list of weights.
For example, if the list is [4, 2, 0], then there's a 66% chance of returning 0,
33% 1, 0% 2. */

function weightedRandomInt(weights) {

  var sumWeights = 0;
  for (var i=0; i<weights.length; i++) {
    sumWeights += weights[i];
  }

  var randomLessThanSumWeights = Math.random() * sumWeights;

  for (var i=0; i<weights.length; i++) {
    if (randomLessThanSumWeights > 0) {
      if (randomLessThanSumWeights <= weights[i]) {
        return i;
      }
    }
    randomLessThanSumWeights -= weights[i];
  }

}

Tile = newTemplate({

  source: SRC_TILES,
  animSpeed: 0,

  value: 1,
  isOnBoard: false,
  squareOnBoard: [null, null],

  // motion animation
  
  MOTION_FRAMES: 8,
  motionFramesLeft: 0,

  update: function() {

    /* The "frame" is the index of the image being displayed (in this case, the
    colour of the tile). There are 15 colours, with tiles 1 and 16 being the
    same colour, etc. */

    this.frame = this.value;

    if (this.motionFramesLeft) {

      if (this.isOnBoard) {
        this.scale[0] *= Math.pow(root.board.scale[0], 1/Tile.MOTION_FRAMES);
        this.scale[1] *= Math.pow(root.board.scale[1], 1/Tile.MOTION_FRAMES);
      }

      this.motionFramesLeft--;
      if (this.motionFramesLeft == 0) {
        this.onMotionStop();
      }

    } else {

      if (this.parent == root.board) {
        this.pos = v2Mul2(this.squareOnBoard, Tile.size);
      } else if (this.parent == root.queue) {
        this.pos = [
          this.parent.tiles().indexOf(this) * Tile.size[0],
          Queue.headerHeight
        ];
      }
    }
  },

  onMotionStop: function() {

    this.vel = [0,0];
    this.scale = [1,1];

    if (this.isOnBoard) {
      root.board.adopt(this);
      root.board.onTileAdd(this.value);
    }

    this.update();
  },

  draw: function() {
    this.drawText(this.value, {
      pos: v2Mul(this.size, 0.5),
      font: "20px Helvetica",
      align: ALIGN_CENTER,
      baseline: "middle"
    })
  }
});

Board = newTemplate({

  numSquares: [5,5],
  MAX_SIZE: 15,

  /* when the score passes a "benchmark", the board resizes */
  benchmarks: [20, 50, 100, 200, 300, 500, 800, 1300],

  update: function() {
    this.size = v2Mul2(this.numSquares, Tile.size);
    if (this.numSquares[0] > Board.MAX_SIZE) {
      this.scale = v2Div2([Board.MAX_SIZE, Board.MAX_SIZE], this.numSquares);
    }

    this.pos = v2Mul(v2Sub(root.size, v2Mul2(this.size, this.scale)), 0.5);
  },

  onTileAdd: function(value) {
    var score = this.score();
    for (var i=0; i<this.benchmarks.length; i++) {
      if (score >= this.benchmarks[i] && score - value < this.benchmarks[i]) {
        this.upsize();
      }
    }
  },

  upsize: function() {
    this.numSquares = v2Add(this.numSquares, [2, 2]);

    var tiles = this.tiles();
    for (var i=0; i<tiles.length; i++) {
      tiles[i].squareOnBoard = v2Add(tiles[i].squareOnBoard, [1, 1]);
    }

    /* You get an instantaneous frame where the board is repositioned to the
    left but not resized yet. No idea why this happens, and calling the _draw
    function doesn't help. Kept it in cause why the hell not. */

    root._draw();

    if (this.numSquares[0] <= Board.MAX_SIZE) {
      root.size = v2Add(root.size, v2Mul(Tile.size, 2));

    }
  },

  addTile: function(value, square) {
    this.new({
      value: value,
      squareOnBoard: square,
      isOnBoard: true,
    }, Tile);
  },

  tiles: function() {
    var tiles = [];
    for (var i=0; i<this.children.length; i++) {
      var thisChild = this.children[i];
      if (thisChild.doesInherit(Tile)) {
        tiles.push(thisChild);
      }
    }
    return tiles;
  },

  tileOnSquare: function(square) {
    var tiles = this.tiles();
    for (var i=0; i<tiles.length; i++) {
      var thisTile = tiles[i];
      if (v2Equals(thisTile.squareOnBoard, square)) {
        return thisTile;
      }
    }
    return null;
  },

  sumOfAdjacentTiles: function(square) {
    var sum = 0;
    for (var col = square[0]-1; col <= square[0]+1; col++) {
      for (var row = square[1]-1; row <= square[1]+1; row++) {
        if (col != square[0] || row != square[1]) {
          var thisTile = this.tileOnSquare([col, row]);
          if (thisTile != null) {
            sum += thisTile.value;
          }
        }
      }
    }
    return sum;
  },

  isAvailable: function(square) {
    return v2GreaterEqual2(square, [0,0]) &&
      v2Greater2(this.numSquares, square) &&
      this.tileOnSquare(square) == null;
  },

  canAddTileOnSquare: function(value, square) {
    return this.isAvailable(square) &&
      this.sumOfAdjacentTiles(square) == value;
  },

  possibleSquares: function(value) {
    var squares = [];
    for (var col = 0; col < this.numSquares[0]; col++) {
      for (var row = 0; row < this.numSquares[1]; row++) {
        if (this.canAddTileOnSquare(value, [col, row])) {
          squares.push([col, row]);
        }
      }
    }
    return squares;
  },

  score: function() {
    sum = 0;
    var tiles = this.tiles();
    for (var i=0; i<tiles.length; i++) {
      sum += tiles[i].value;
    }
    return sum;
  },

  mouseSquare: function() {
    return v2Floor(v2Div2(this.mouse(), v2Mul2(Tile.size, this.scale)));
  },

  draw: function() {
    for (var col = 0; col < this.numSquares[0]; col++) {
      for (var row = 0; row < this.numSquares[1]; row++) {
        if ((col + row) % 2 == 0) {
          var image = SRC_SQUARE_LIGHT;
        } else {
          var image = SRC_SQUARE_DARK;
        }

        this.drawImage(image, {
          pos: v2Mul2([col, row], Tile.size)
        });
      }
    }
  }

});

Queue = newTemplate({

  capacity: 4,
  headerHeight: 50,
  footerHeight: 40,

  update: function () {
    this.size = v2Add(v2Mul2([this.capacity, 1], Tile.size),
      [0, Queue.headerHeight + Queue.footerHeight]);
    this.pos = [
      (root.size[0] - this.size[0]) / 2,
      root.board.pos[1] + root.board.size[1] * root.board.scale[1] + Tile.size[1]
    ];
  },

  // Adds a tile with a specific value to the end of the queue.
  addTile: function(value) {
    var tile = this.new({
      value: value,
      positionInQueue: this.tiles().length,
      isOnBoard: false
    }, Tile);
  },

  addRandomTile: function() {

    // maximum possible value of a tile depends on the # of tiles on the board
    var maxTileValue =
      Math.ceil(1/2 + (5/6) * Math.pow(root.board.tiles().length, 2/3));

    /* So to balance things out we're making a list of the "desired" tile value
    frequencies - we want 1 to occur about twice as often as 2, thrice as often
    as 3, etc. If the current value distribution is out of wack, we tend towards
    fixing it (keeping a suitable amount of randomness).

    To get the desired tile value frequency as a percentage we just sum the
    reciprocals of all the possible tile values to use as our denominator. */

    var sumDesiredTileValueFreqs = 0;
    for (var tileValue = 1; tileValue <= maxTileValue; tileValue++) {
      sumDesiredTileValueFreqs += 1 / tileValue;
    }

    /* Now we pick a tile value from a weighted list (see weightedRandomInt().)
    To get a value's weight we consider how much higher the desired frequency
    of that tile value is compared to its actual frequency. */

    var weightsOfTileValues = [0.0];
    for (var tileValue = 1; tileValue <= maxTileValue; tileValue++) {
      tileValueFreq = root.tilesWithValue(tileValue).length / root.tiles().length;
      desiredTileValueFreq = (1 / tileValue) / sumDesiredTileValueFreqs;

      /* 8 is a number I just pulled out of my ass when 5 was too random
      and 10 was too predictable. I tested about twice for each number to make
      that decision lol. */

      weightsOfTileValues.push(Math.pow(8, desiredTileValueFreq / tileValueFreq));

      /* This was how I did it the old way. Too random imo. */
      /* weightsOfTileValues.push(
        (0.5 + Math.pow(0.5, tileValue) *
        Math.pow(0.75, root.tilesWithValue(tileValue).length)
      ); */
    }

    this.addTile(weightedRandomInt(weightsOfTileValues));
  },

  tiles: function() {
    var tiles = [];
    for (var i=0; i<this.children.length; i++) {
      var thisChild = this.children[i];
      if (thisChild.doesInherit(Tile)) {
        tiles.push(thisChild);
      }
    }
    return tiles;
  },

  draw: function() {
    this.drawText("Queue", {
      pos: [this.size[0]/2, this.headerHeight/2],
      font: "24px Helvetica",
      align: ALIGN_CENTER,
      baseline: "middle"
    })

    this.drawImage(SRC_QUEUEARROW, {
      pos: [0, this.headerHeight + Tile.size[1]],
      size: [160, 40]
    })
  }
});

GameOverBanner = newTemplate({
  update: function () {
    this.size = [root.board.size[0] + Tile.size[0], Tile.size[1] * 2];
    this.pos = v2Mul(v2Sub(root.size, this.size), 0.5);
  },

  draw: function () {
    this.drawImage(SRC_GAMEOVER, {
      pos: [0,0],
      size: this.size
    });
    this.drawText("Game over!", {
      pos: v2Mul(this.size, 0.5),
      font: "32px Helvetica",
      col: "#FFFFFF",
      align: ALIGN_CENTER,
      baseline: "middle"
    });
  }

});

root.setCanvasById("JamesCanvas");

root.onStart = function() {

  // clean up after the last game if necessary
  
  this.isGameOver = false;

  for (var i=0; i<this.children.length; i++) {
    if (this.children[i].doesInherit(GameOverBanner)) {
      this.children[i].destroy();
    }
  }

  this.board.numSquares = [5,5];
  while (this.board.children.length) {
    this.board.children[0].destroy();
  }
  while (this.queue.children.length) {
    this.queue.children[0].destroy();
  }

  // setup
  
  root.board.addTile(1, [2,2]);
  root.queue.addTile(1);
  for (var i=1; i<Queue.capacity; i++) {
    root.queue.addRandomTile();
  }

  this.size = v2Mul2([40, 40], [7, 13]);
  
  this.motionFramesLeft = 0;
}

root.update = function() {

  if (this.motionFramesLeft) {
    this.motionFramesLeft--;
    if (this.motionFramesLeft == 0) {
      this.onMotionStop();
    }

  } else {

    if (pressed(M_LEFT)) {
      if (this.isGameOver) {
        this.onStart();

      } else {
        var value = this.queue.tiles()[0].value;
        var square = this.board.mouseSquare();
        if (this.board.canAddTileOnSquare(value, square)) {

          /* Root animation takes slightly longer than tile animation so that
          the tiles all finish before the root does. */

          this.motionFramesLeft = Tile.MOTION_FRAMES + 1;

          /* Set up animation for the tile in the front of the queue.
          Store the destination square for the tile and make sure it knows to
          attach itself to the board when it's done the animation. */

          var tileToPlace = this.queue.tiles()[0];
          tileToPlace.isOnBoard = true;
          tileToPlace.squareOnBoard = square;

          /* Move the tile "outside" of the queue, so that it is displayed on
          screen when it's moving. Adjust its position accordingly. */

          this.adopt(tileToPlace);
          tileToPlace.pos = v2Add(tileToPlace.pos, this.queue.pos);

          /* Determine the tile's velocity when it's moving by its starting
          and ending positions. */

          var destinationPos = v2Add(v2Mul2(square, v2Mul2(Tile.size, this.board.scale)), this.board.pos);
          tileToPlace.vel = v2Div(v2Sub(destinationPos, tileToPlace.pos), Tile.MOTION_FRAMES);

          tileToPlace.motionFramesLeft = Tile.MOTION_FRAMES;

          /* Move all the rest of the tiles in the queue one space forward. */
		  
          var queueTiles = this.queue.tiles();
          for (var i=0; i<queueTiles.length; i++) {
            queueTiles[i].vel = v2Mul2(Tile.size, [-1 / Tile.MOTION_FRAMES, 0]);
            queueTiles[i].motionFramesLeft = Tile.MOTION_FRAMES;
          }
        }
      }
    }
  }
}

root.onGameOver = function () {
  this.isGameOver = true;
  this.new({}, GameOverBanner)
}

root.onMotionStop = function() {
  this.queue.addRandomTile();

  if (this.board.possibleSquares(this.queue.tiles()[0].value).length == 0) {
    this.onGameOver();
  }
}

root.tiles = function() {
  return this.board.tiles().concat(this.queue.tiles());
}

root.tilesWithValue = function(value) {
  var tilesWithValue = [];
  var tiles = this.tiles();
  for (var i=0; i<tiles.length; i++) {
    thisTile = tiles[i];
    if (thisTile.value == value) {
      tilesWithValue.push(thisTile);
    }
  }
  return tilesWithValue;
}

root.draw = function() {

  this.drawText(
    "Connect Plus", {
    pos: [root.size[0] / 2, 40],
    font: "32px Helvetica",
    align: ALIGN_CENTER,
    baseline: "middle"
  } );

  this.drawText(
    "Made by hPerks", {
    pos: [root.size[0] / 2, 70],
    font: "16px Helvetica",
    align: ALIGN_CENTER,
    baseline: "middle"
  } );

  this.drawText(
    "Score: " + this.board.score(), {
    pos: [root.size[0] / 2, this.board.pos[1] - 30],
    font: "24px Helvetica",
    align: ALIGN_CENTER,
    baseline: "middle"
  } );
}

root.board = root.new({}, Board);
root.queue = root.new({}, Queue);

root.onStart();

startJames();
