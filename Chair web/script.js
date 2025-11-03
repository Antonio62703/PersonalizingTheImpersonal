// Grid Navigation System
(function initGridNavigation() {
  const warningScreen = document.getElementById('warningScreen');
  const gridScreen = document.getElementById('gridScreen');
  const gridSvg = document.getElementById('gridSvg');
  const mainApp = document.querySelector('.app');
  
  if (!gridScreen || !gridSvg || !mainApp) return;
  
  // Show warning screen for 1 second, then transition to grid
  setTimeout(() => {
    // Show grid screen FIRST so it's visible as warning slides up
    gridScreen.classList.add('active');
    
    // Then start slide up animation for warning screen
    warningScreen.classList.add('slide-up');
    
    // Hide warning screen element after animation completes
    setTimeout(() => {
      warningScreen.style.display = 'none';
    }, 2000); // Wait full 2 seconds for animation to complete
  }, 1000); // Show warning for 1 second
  
  const GRID_SIZE = 10;
  const CELL_SIZE = 1000 / GRID_SIZE;
  
  // Floor plan configuration
  // Define specific cell types you want to customize
  const cellTypes = {
    0: { fill: '#000000', stroke: 'none', strokeWidth: 0, walkable: true },   // Black with no border (ONLY WALKABLE TYPE)
    1: { fill: '#ffffff', stroke: 'none', strokeWidth: 0, walkable: false },  // White wall (not walkable)
    2: { fill: 'transparent', stroke: 'none', strokeWidth: 0, walkable: false }, // Clear/empty - no block rendered (NOT walkable)
    3: { fill: 'gradient', stroke: 'none', strokeWidth: 0, walkable: true },  // Fading block (walkable for hidden rooms)
    // Any number not defined here will automatically get a random color!
  };
  
  // Function to generate a cell type for any undefined number
  function getCellType(value) {
    // If already defined, return it
    if (cellTypes[value]) {
      return cellTypes[value];
    }
    
    // Generate a random color based on the number (consistent for same number)
    const hue = (value * 137.508) % 360; // Golden angle for good color distribution
    const saturation = 70;
    const lightness = 50;
    const fillColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    // Create and cache the new cell type
    cellTypes[value] = {
      fill: fillColor,
      stroke: '#ffffff',
      strokeWidth: 1,
      walkable: false  // Default to NOT walkable (only 0 is walkable)
    };
    
    return cellTypes[value];
  }
  
  // Floor plan: Use any number! Undefined numbers get auto-generated colors
  // Based on the uploaded floor plan image
  const floorPlan = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0],
    [0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0],
    [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0],
    [0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0],
    [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0],
    [0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0],
    [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0],
    [0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0],
    [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0],
    [0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0],
    [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0],
    [0, 0, 0, 0, 3, 3, 3, 3, 0, 0, 0, 0],
    [0, 0, 0, 0, 3, 3, 3, 3, 0, 0, 0, 0],
  ];
  
  // Player position - start at a walkable position
  let playerX = 3;
  let playerY = 1;
  
  // Star position - find a random type 0 (walkable) cell
  let starX = 5;
  let starY = 7;
  
  // Function to find all walkable cells
  function findWalkableCells() {
    const walkableCells = [];
    for (let row = 0; row < floorPlan.length; row++) {
      for (let col = 0; col < (floorPlan[row] ? floorPlan[row].length : 0); col++) {
        if (floorPlan[row][col] === 0) {
          walkableCells.push({ x: col, y: row });
        }
      }
    }
    return walkableCells;
  }
  
  // Set star to a random walkable position
  const walkableCells = findWalkableCells();
  if (walkableCells.length > 0) {
    const randomCell = walkableCells[Math.floor(Math.random() * walkableCells.length)];
    starX = randomCell.x;
    starY = randomCell.y;
  }
  
  // Eye icon position - place in block 3 area (bottom rows)
  let eyeX = 6; // Middle of the grid
  let eyeY = 12; // First row of block 3
  let eyeIcon;
  
  // Second eye icon for floorplan - place in walkable corridor (type 0) between walls
  let floorplanEyeX = 1; // Left corridor
  let floorplanEyeY = 5; // Middle of the map
  let floorplanEyeIcon;
  
  let playerCircle, starPolygon;
  
  // Camera settings
  const ZOOM_FACTOR = 2; // How much to zoom in (3 = show 1/3 of grid)
  const VISIBLE_CELLS = 15; // Number of cells visible in each direction
  
  // Track visited cells for trail
  const visitedCells = new Set();
  visitedCells.add(`${playerX},${playerY}`); // Add starting position
  
  let lastPlayerX = playerX;
  let lastPlayerY = playerY;
  
  // Track if player is currently on a block 3 cell - initialize based on starting position
  let isPlayerOnBlock3 = (floorPlan[playerY] && floorPlan[playerY][playerX] === 3);
  
  function drawGrid() {
    // Clear existing content
    gridSvg.innerHTML = '';
    
    // Calculate grid dimensions based on floorPlan array
    const rowCount = floorPlan.length;
    const colCount = Math.max(...floorPlan.map(row => row.length)); // Get max column count
    
    // Calculate base viewBox dimensions
    const viewBoxWidth = 1000;
    const viewBoxHeight = (rowCount / colCount) * viewBoxWidth;
    
    const cellWidth = viewBoxWidth / colCount;
    const cellHeight = viewBoxHeight / rowCount;
    
    // Add padding to viewBox so thick border strokes are fully visible
    const borderPadding = 5;
    gridSvg.setAttribute('viewBox', `${-borderPadding} ${-borderPadding} ${viewBoxWidth + borderPadding * 2} ${viewBoxHeight + borderPadding * 2}`);
    
    // Create gradient definition for type 3 cells (fading effect)
    // Fades from transparent (shows grid) -> solid black -> transparent (shows grid)
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'fadeGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');
    
    // Create fade: transparent -> black -> transparent
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('style', 'stop-color:#000000;stop-opacity:0');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '25%');
    stop2.setAttribute('style', 'stop-color:#000000;stop-opacity:0.5');
    
    const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop3.setAttribute('offset', '50%');
    stop3.setAttribute('style', 'stop-color:#000000;stop-opacity:1');
    
    const stop4 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop4.setAttribute('offset', '75%');
    stop4.setAttribute('style', 'stop-color:#000000;stop-opacity:0.5');
    
    const stop5 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop5.setAttribute('offset', '100%');
    stop5.setAttribute('style', 'stop-color:#000000;stop-opacity:0');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    gradient.appendChild(stop3);
    gradient.appendChild(stop4);
    gradient.appendChild(stop5);
    defs.appendChild(gradient);
    gridSvg.appendChild(defs);
    
    // Draw thin background grid first - optimized for performance
    const gridExtension = 2000; // Larger extension for better coverage
    
    // Create a group for background grid lines to ensure they stay behind everything
    const bgGridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    bgGridGroup.setAttribute('class', 'background-grid-group');
    gridSvg.appendChild(bgGridGroup);
    
    // Draw sufficient lines to cover zoomed view (visible area + large buffer for camera)
    for (let row = -50; row <= rowCount + 50; row++) {
      const y = row * cellHeight;
      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gridLine.setAttribute('x1', -gridExtension);
      gridLine.setAttribute('y1', y);
      gridLine.setAttribute('x2', viewBoxWidth + gridExtension);
      gridLine.setAttribute('y2', y);
      gridLine.setAttribute('stroke', '#ffffff');
      gridLine.setAttribute('stroke-width', '2');
      gridLine.setAttribute('vector-effect', 'non-scaling-stroke');
      gridLine.setAttribute('opacity', '0.3');
      gridLine.setAttribute('class', 'background-grid-line');
      bgGridGroup.appendChild(gridLine);
    }
    
    for (let col = -50; col <= colCount + 50; col++) {
      const x = col * cellWidth;
      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gridLine.setAttribute('x1', x);
      gridLine.setAttribute('y1', -gridExtension);
      gridLine.setAttribute('x2', x);
      gridLine.setAttribute('y2', viewBoxHeight + gridExtension);
      gridLine.setAttribute('stroke', '#ffffff');
      gridLine.setAttribute('stroke-width', '2');
      gridLine.setAttribute('vector-effect', 'non-scaling-stroke');
      gridLine.setAttribute('opacity', '0.3');
      gridLine.setAttribute('class', 'background-grid-line');
      bgGridGroup.appendChild(gridLine);
    }
    
    // Draw floor plan cells
    for (let row = 0; row < rowCount; row++) {
      const currentRowLength = floorPlan[row] ? floorPlan[row].length : 0;
      
      for (let col = 0; col < currentRowLength; col++) {
        const x = col * cellWidth;
        const y = row * cellHeight;
        const cellValue = floorPlan[row][col];
        const cellType = getCellType(cellValue);
        
        // Skip rendering type 2 cells - they're just empty space
        if (cellValue === 2) continue;
        
        // For type 3 (gradient cells), draw differently based on if player is on block 3
        if (cellValue === 3) {
          if (isPlayerOnBlock3) {
            // Player is on block 3 - render as WHITE
            const whiteRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            whiteRect.setAttribute('x', x);
            whiteRect.setAttribute('y', y);
            whiteRect.setAttribute('width', cellWidth);
            whiteRect.setAttribute('height', cellHeight);
            whiteRect.setAttribute('fill', '#ffffff');
            whiteRect.setAttribute('stroke', 'none');
            whiteRect.setAttribute('shape-rendering', 'crispEdges');
            gridSvg.appendChild(whiteRect);
          } else {
            // Player is NOT on block 3 - render as solid black (default appearance)
            const solidRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            solidRect.setAttribute('x', x);
            solidRect.setAttribute('y', y);
            solidRect.setAttribute('width', cellWidth);
            solidRect.setAttribute('height', cellHeight);
            solidRect.setAttribute('fill', '#000000');
            solidRect.setAttribute('stroke', 'none');
            solidRect.setAttribute('shape-rendering', 'crispEdges');
            gridSvg.appendChild(solidRect);
          }
          continue;
        }
        
        // For type 1 (white walls), draw a black background first, then the horizontal line
        if (cellValue === 1) {
          // Draw black background to cover grid lines
          const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          bgRect.setAttribute('x', x);
          bgRect.setAttribute('y', y);
          bgRect.setAttribute('width', cellWidth);
          bgRect.setAttribute('height', cellHeight);
          bgRect.setAttribute('fill', '#000000');
          bgRect.setAttribute('stroke', 'none');
          gridSvg.appendChild(bgRect);
          
          // Draw horizontal line on top
          const lineY = y + cellHeight / 2;
          
          const wallLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          wallLine.setAttribute('x1', x);
          wallLine.setAttribute('y1', lineY);
          wallLine.setAttribute('x2', x + cellWidth);
          wallLine.setAttribute('y2', lineY);
          wallLine.setAttribute('stroke', cellType.fill);
          wallLine.setAttribute('stroke-width', '3');
          wallLine.setAttribute('vector-effect', 'non-scaling-stroke');
          wallLine.setAttribute('shape-rendering', 'crispEdges');
          
          gridSvg.appendChild(wallLine);
          continue;
        }
        
        // Draw normal cell rectangle for non-wall types
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', cellWidth);
        rect.setAttribute('height', cellHeight);
        rect.setAttribute('fill', cellType.fill);
        rect.setAttribute('shape-rendering', 'crispEdges');
        rect.setAttribute('pointer-events', 'all');
        
        // Add stroke if specified
        if (cellType.stroke !== 'none' && cellType.strokeWidth > 0) {
          rect.setAttribute('stroke', cellType.stroke);
          rect.setAttribute('stroke-width', cellType.strokeWidth);
          rect.classList.add('grid-line');
        } else {
          rect.setAttribute('stroke', 'none');
          rect.setAttribute('stroke-width', '0');
        }
        
        gridSvg.appendChild(rect);
      }
    }
    
    // Draw outer border around the entire map
    // This creates the outline of the floor plan shape
    const borderPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let pathData = '';
    
    // Build the outer perimeter path by tracing the edges
    for (let row = 0; row < rowCount; row++) {
      const currentRowLength = floorPlan[row] ? floorPlan[row].length : 0;
      
      for (let col = 0; col < currentRowLength; col++) {
        const cellValue = floorPlan[row][col];
        
        // Skip type 2 cells (transparent)
        if (cellValue === 2) continue;
        
        const x = col * cellWidth;
        const y = row * cellHeight;
        
        // Check adjacent cells
        const topCell = row > 0 && floorPlan[row - 1] && col < floorPlan[row - 1].length ? floorPlan[row - 1][col] : undefined;
        const bottomCell = row < rowCount - 1 && floorPlan[row + 1] && col < floorPlan[row + 1].length ? floorPlan[row + 1][col] : undefined;
        const leftCell = col > 0 ? floorPlan[row][col - 1] : undefined;
        const rightCell = col < currentRowLength - 1 ? floorPlan[row][col + 1] : undefined;
        
        let hasTop, hasBottom, hasLeft, hasRight;
        
        if (cellValue === 1) {
          // Type 1 wall: draw border only where it touches type 2
          hasTop = topCell === 2;
          hasBottom = bottomCell === 2;
          hasLeft = leftCell === 2;
          hasRight = rightCell === 2;
        } else if (cellValue === 3) {
          // Type 3: draw border only when player IS on block 3 (when it's white)
          if (isPlayerOnBlock3) {
            // Draw borders when player is on block 3 (white state needs borders)
            hasTop = topCell !== 3; // Draw border on top if not adjacent to another type 3
            hasBottom = bottomCell !== 3; // Draw border on bottom if not adjacent to another type 3
            hasLeft = leftCell !== 3 || col === 0; // Draw left border 
            hasRight = rightCell !== 3 || col === currentRowLength - 1; // Draw right border
          } else {
            // No borders when player is NOT on block 3 (black blends in)
            hasTop = false;
            hasBottom = false;
            hasLeft = false;
            hasRight = false;
          }
        } else {
          // Type 0: draw border where it touches type 2 OR at map edges OR where it touches block 3
          hasTop = topCell === 2 || row === 0 || topCell === 3;
          hasBottom = bottomCell === 2 || row === rowCount - 1 || bottomCell === 3;
          hasLeft = leftCell === 2 || col === 0 || leftCell === 3;
          hasRight = rightCell === 2 || col === currentRowLength - 1 || rightCell === 3;
        }
        
        // Draw border lines
        if (hasTop) {
          pathData += `M ${x} ${y} L ${x + cellWidth} ${y} `;
        }
        if (hasBottom) {
          pathData += `M ${x} ${y + cellHeight} L ${x + cellWidth} ${y + cellHeight} `;
        }
        if (hasLeft) {
          pathData += `M ${x} ${y} L ${x} ${y + cellHeight} `;
        }
        if (hasRight) {
          pathData += `M ${x + cellWidth} ${y} L ${x + cellWidth} ${y + cellHeight} `;
        }
      }
    }
    
    borderPath.setAttribute('d', pathData);
    borderPath.setAttribute('stroke', '#ffffff');
    borderPath.setAttribute('stroke-width', '3');
    borderPath.setAttribute('fill', 'none');
    borderPath.setAttribute('vector-effect', 'non-scaling-stroke');
    borderPath.setAttribute('shape-rendering', 'crispEdges');
    gridSvg.appendChild(borderPath);
    
    // Draw trail dots for visited cells (skip trails in block 3 areas)
    visitedCells.forEach(cellKey => {
      const [x, y] = cellKey.split(',').map(Number);
      if (x === playerX && y === playerY) return; // Skip current position
      
      // Skip trail dots in block 3 cells
      if (floorPlan[y] && floorPlan[y][x] === 3) return;
      
      const trailDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      trailDot.setAttribute('cx', x * cellWidth + cellWidth / 2);
      trailDot.setAttribute('cy', y * cellHeight + cellHeight / 2);
      trailDot.setAttribute('r', cellWidth / 16); // Smaller dot (1/16 size)
      trailDot.setAttribute('fill', '#ffffff'); // White
      trailDot.setAttribute('opacity', '1'); // 100% opacity
      gridSvg.appendChild(trailDot);
    });
    
    // Draw star
    starPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    starPolygon.setAttribute('x', starX * cellWidth + cellWidth / 2);
    starPolygon.setAttribute('y', starY * cellHeight + cellHeight / 2 + 15);
    starPolygon.setAttribute('text-anchor', 'middle');
    starPolygon.setAttribute('font-size', '40');
    starPolygon.setAttribute('fill', '#ffff00');
    starPolygon.classList.add('grid-star');
    starPolygon.textContent = '★';
    gridSvg.appendChild(starPolygon);
    
    // Draw eye icon in block 3 (only visible when player is on block 3)
    if (isPlayerOnBlock3) {
      const eyeCenterX = eyeX * cellWidth + cellWidth / 2;
      const eyeCenterY = eyeY * cellHeight + cellHeight / 2;
      
      // Create eye group
      const eyeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      eyeGroup.classList.add('grid-eye');
      
      // Eye outline (ellipse)
      const eyeOutline = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      eyeOutline.setAttribute('cx', eyeCenterX);
      eyeOutline.setAttribute('cy', eyeCenterY);
      eyeOutline.setAttribute('rx', cellWidth / 6);
      eyeOutline.setAttribute('ry', cellWidth / 8);
      eyeOutline.setAttribute('fill', 'none');
      eyeOutline.setAttribute('stroke', '#000000');
      eyeOutline.setAttribute('stroke-width', '3');
      eyeOutline.setAttribute('vector-effect', 'non-scaling-stroke');
      
      // Pupil (circle)
      const pupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pupil.setAttribute('cx', eyeCenterX);
      pupil.setAttribute('cy', eyeCenterY);
      pupil.setAttribute('r', cellWidth / 12);
      pupil.setAttribute('fill', 'none');
      pupil.setAttribute('stroke', '#000000');
      pupil.setAttribute('stroke-width', '3');
      pupil.setAttribute('vector-effect', 'non-scaling-stroke');
      
      eyeGroup.appendChild(eyeOutline);
      eyeGroup.appendChild(pupil);
      gridSvg.appendChild(eyeGroup);
      
      eyeIcon = eyeGroup;
    }
    
    // Draw second eye icon for floorplan (always visible in gap area)
    const floorplanEyeCenterX = floorplanEyeX * cellWidth + cellWidth / 2;
    const floorplanEyeCenterY = floorplanEyeY * cellHeight + cellHeight / 2;
    
    // Create floorplan eye group
    const floorplanEyeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    floorplanEyeGroup.classList.add('grid-eye', 'floorplan-eye');
    
    // Eye outline (ellipse)
    const floorplanEyeOutline = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    floorplanEyeOutline.setAttribute('cx', floorplanEyeCenterX);
    floorplanEyeOutline.setAttribute('cy', floorplanEyeCenterY);
    floorplanEyeOutline.setAttribute('rx', cellWidth / 6);
    floorplanEyeOutline.setAttribute('ry', cellWidth / 8);
    floorplanEyeOutline.setAttribute('fill', 'none');
    floorplanEyeOutline.setAttribute('stroke', '#ffffff');
    floorplanEyeOutline.setAttribute('stroke-width', '3');
    floorplanEyeOutline.setAttribute('vector-effect', 'non-scaling-stroke');
    
    // Pupil (circle)
    const floorplanPupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    floorplanPupil.setAttribute('cx', floorplanEyeCenterX);
    floorplanPupil.setAttribute('cy', floorplanEyeCenterY);
    floorplanPupil.setAttribute('r', cellWidth / 12);
    floorplanPupil.setAttribute('fill', 'none');
    floorplanPupil.setAttribute('stroke', '#ffffff');
    floorplanPupil.setAttribute('stroke-width', '3');
    floorplanPupil.setAttribute('vector-effect', 'non-scaling-stroke');
    
    floorplanEyeGroup.appendChild(floorplanEyeOutline);
    floorplanEyeGroup.appendChild(floorplanPupil);
    gridSvg.appendChild(floorplanEyeGroup);
    
    floorplanEyeIcon = floorplanEyeGroup;
    
    // Draw player circle (black if on block 3, white otherwise)
    playerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    playerCircle.setAttribute('cx', playerX * cellWidth + cellWidth / 2);
    playerCircle.setAttribute('cy', playerY * cellHeight + cellHeight / 2);
    
    if (isPlayerOnBlock3) {
      // When on block 3: black fill with thick WHITE stroke for visibility
      playerCircle.setAttribute('r', cellWidth / 3.5); // Slightly larger
      playerCircle.setAttribute('fill', '#000000');
      playerCircle.setAttribute('stroke', '#ffffff');
      playerCircle.setAttribute('stroke-width', '6');
    } else {
      // Normal: white with black stroke
      playerCircle.setAttribute('r', cellWidth / 4);
      playerCircle.setAttribute('fill', '#ffffff');
      playerCircle.setAttribute('stroke', '#000000');
      playerCircle.setAttribute('stroke-width', '3');
    }
    
    playerCircle.setAttribute('vector-effect', 'non-scaling-stroke');
    playerCircle.setAttribute('pointer-events', 'all');
    playerCircle.classList.add('grid-player');
    gridSvg.appendChild(playerCircle);
  }
  
  function updatePlayerPosition() {
    if (playerCircle) {
      const rowCount = floorPlan.length;
      const colCount = Math.max(...floorPlan.map(row => row.length));
      const viewBoxWidth = 1000;
      const viewBoxHeight = (rowCount / colCount) * viewBoxWidth;
      const cellWidth = viewBoxWidth / colCount;
      const cellHeight = viewBoxHeight / rowCount;
      
      // Check if player is now on a block 3 cell
      const currentCellValue = floorPlan[playerY] && floorPlan[playerY][playerX] !== undefined 
        ? floorPlan[playerY][playerX] 
        : null;
      const wasOnBlock3 = isPlayerOnBlock3;
      isPlayerOnBlock3 = (currentCellValue === 3);
      
      // Show/hide block 3 location text
      const block3Text = document.querySelector('.block3-location-text');
      if (block3Text) {
        if (isPlayerOnBlock3) {
          block3Text.classList.add('visible');
        } else {
          block3Text.classList.remove('visible');
        }
      }
      
      // If block 3 status changed, redraw entire grid
      if (wasOnBlock3 !== isPlayerOnBlock3) {
        // Save camera position before redrawing
        const cameraWidth = viewBoxWidth / ZOOM_FACTOR;
        const cameraHeight = viewBoxHeight / ZOOM_FACTOR;
        const cameraCenterX = (playerX + 0.5) * cellWidth;
        const cameraCenterY = (playerY + 0.5) * cellHeight;
        const cameraX = cameraCenterX - cameraWidth / 2;
        const cameraY = cameraCenterY - cameraHeight / 2;
        
        // Immediately redraw for instant response
        drawGrid();
        
        // Restore camera position after redrawing
        gridSvg.setAttribute('viewBox', `${cameraX} ${cameraY} ${cameraWidth} ${cameraHeight}`);
        
        // Redraw background grid for new viewBox
        if (window.redrawBackgroundGrid) {
          window.redrawBackgroundGrid(cameraX, cameraY, cameraWidth, cameraHeight);
        }
        
        return; // Done - camera already updated
      }
      
      // Update player circle color based on current block 3 status (for normal movement within block 3)
      if (playerCircle) {
        if (isPlayerOnBlock3) {
          playerCircle.setAttribute('r', cellWidth / 3.5);
          playerCircle.setAttribute('fill', '#000000');
          playerCircle.setAttribute('stroke', '#ffffff');
          playerCircle.setAttribute('stroke-width', '6');
        } else {
          playerCircle.setAttribute('r', cellWidth / 4);
          playerCircle.setAttribute('fill', '#ffffff');
          playerCircle.setAttribute('stroke', '#000000');
          playerCircle.setAttribute('stroke-width', '3');
        }
      }
      
      // Add trail dot at OLD position before moving player
      const oldCellKey = `${lastPlayerX},${lastPlayerY}`;
      if (!visitedCells.has(oldCellKey)) {
        visitedCells.add(oldCellKey);
        
        // Skip drawing trail dot if the old position was in block 3
        const oldCellValue = floorPlan[lastPlayerY] && floorPlan[lastPlayerY][lastPlayerX] !== undefined 
          ? floorPlan[lastPlayerY][lastPlayerX] 
          : null;
        
        if (oldCellValue !== 3) {
          // Draw trail dot at the old position (only if not in block 3)
          const trailDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          trailDot.setAttribute('cx', lastPlayerX * cellWidth + cellWidth / 2);
          trailDot.setAttribute('cy', lastPlayerY * cellHeight + cellHeight / 2);
          trailDot.setAttribute('r', cellWidth / 16);
          trailDot.setAttribute('fill', '#ffffff');
          trailDot.setAttribute('opacity', '1');
          trailDot.setAttribute('class', 'trail-dot');
          // Insert before player circle so trail is behind
          gridSvg.insertBefore(trailDot, playerCircle);
        }
      }
      
      // Update player position
      playerCircle.setAttribute('cx', playerX * cellWidth + cellWidth / 2);
      playerCircle.setAttribute('cy', playerY * cellHeight + cellHeight / 2);
      
      // Remember current position for next move
      lastPlayerX = playerX;
      lastPlayerY = playerY;
      
      // Update camera to follow player
      const cameraWidth = viewBoxWidth / ZOOM_FACTOR;
      const cameraHeight = viewBoxHeight / ZOOM_FACTOR;
      
      const cameraCenterX = (playerX + 0.5) * cellWidth;
      const cameraCenterY = (playerY + 0.5) * cellHeight;
      
      // Allow camera to go beyond map boundaries to show extended grid
      const cameraX = cameraCenterX - cameraWidth / 2;
      const cameraY = cameraCenterY - cameraHeight / 2;
      
      // Update camera view
      gridSvg.setAttribute('viewBox', `${cameraX} ${cameraY} ${cameraWidth} ${cameraHeight}`);
      
      // Redraw background grid for new viewBox
      if (window.redrawBackgroundGrid) {
        window.redrawBackgroundGrid(cameraX, cameraY, cameraWidth, cameraHeight);
      }
    }
    
    // Check if player reached the star
    if (playerX === starX && playerY === starY) {
      enterMainWebsite();
    }
    
    // Check if player reached the eye icon
    if (playerX === eyeX && playerY === eyeY) {
      showTopViewWindow();
    } else {
      hideTopViewWindow();
    }
    
    // Check if player is on the floorplan eye icon
    if (playerX === floorplanEyeX && playerY === floorplanEyeY) {
      showFloorplanWindow();
    } else {
      hideFloorplanWindow();
    }
  }
  
  function enterMainWebsite() {
    // Show warning screen with up-down animation (start hidden at bottom)
    warningScreen.style.display = 'flex';
    warningScreen.classList.remove('slide-up', 'slide-up-down');
    warningScreen.style.transform = 'translateY(100%)'; // Start hidden to prevent flash
    
    // Start animation immediately without delay
    requestAnimationFrame(() => {
      warningScreen.classList.add('slide-up-down');
      
      // Switch screens at the halfway point (1 second) when warning is fully covering
      setTimeout(() => {
        gridScreen.classList.remove('active');
        gridScreen.style.display = 'none';
        gridScreen.style.pointerEvents = 'none';
        mainApp.classList.remove('hidden');
        
        // Initialize chair while covered
        if (window.initializeChair) {
          window.initializeChair();
        }
        if (window.updateChairPerspective) {
          window.updateChairPerspective();
        }
        
        // Reinitialize cursor after app is fully visible and warning is gone
        setTimeout(() => {
          if (window.initCustomCursor) {
            window.initCustomCursor();
          }
        }, 2200); // After warning screen is completely gone
      }, 1000); // Switch at halfway point (1 second)
      
      // Hide warning after full animation completes
      setTimeout(() => {
        warningScreen.style.display = 'none';
        warningScreen.style.pointerEvents = 'none';
        warningScreen.classList.remove('slide-up-down');
        warningScreen.style.transform = ''; // Reset transform
      }, 2000); // 2 second animation
    });
  }
  
  function showTopViewWindow() {
    const topviewWindow = document.querySelector('.topview-window');
    
    if (!topviewWindow) return;
    
    // Show the top view window by sliding it in
    topviewWindow.classList.add('visible');
  }
  
  function hideTopViewWindow() {
    const topviewWindow = document.querySelector('.topview-window');
    if (topviewWindow) {
      topviewWindow.classList.remove('visible');
    }
  }
  
  function showFloorplanWindow() {
    const floorplanWindow = document.querySelector('.floorplan-window');
    if (floorplanWindow) {
      floorplanWindow.classList.add('visible');
    }
  }
  
  function hideFloorplanWindow() {
    const floorplanWindow = document.querySelector('.floorplan-window');
    if (floorplanWindow) {
      floorplanWindow.classList.remove('visible');
    }
  }
  
  // Auto-scroll functionality for windows
  (function() {
    const floorplanWindow = document.querySelector('.floorplan-window');
    const topviewContent = document.querySelector('.topview-content');
    
    let floorplanAutoScrolling = false;
    let topviewAutoScrolling = false;
    let floorplanScrollInterval;
    let topviewScrollInterval;
    
    // Function to start auto-scroll for floorplan window
    function startFloorplanAutoScroll() {
      if (floorplanAutoScrolling) return;
      floorplanAutoScrolling = true;
      
      floorplanScrollInterval = setInterval(() => {
        if (floorplanWindow && floorplanAutoScrolling) {
          floorplanWindow.scrollTop += 1; // Scroll 1px at a time for smooth effect
        }
      }, 30); // Update every 30ms for smooth scrolling
    }
    
    // Function to stop auto-scroll for floorplan window
    function stopFloorplanAutoScroll() {
      floorplanAutoScrolling = false;
      if (floorplanScrollInterval) {
        clearInterval(floorplanScrollInterval);
      }
    }
    
    // Function to start auto-scroll for topview window
    function startTopviewAutoScroll() {
      if (topviewAutoScrolling) return;
      topviewAutoScrolling = true;
      
      topviewScrollInterval = setInterval(() => {
        if (topviewContent && topviewAutoScrolling) {
          topviewContent.scrollTop += 1; // Scroll 1px at a time for smooth effect
        }
      }, 30); // Update every 30ms for smooth scrolling
    }
    
    // Function to stop auto-scroll for topview window
    function stopTopviewAutoScroll() {
      topviewAutoScrolling = false;
      if (topviewScrollInterval) {
        clearInterval(topviewScrollInterval);
      }
    }
    
    // Detect user scroll on floorplan and stop auto-scroll
    if (floorplanWindow) {
      let lastScrollTop = 0;
      floorplanWindow.addEventListener('scroll', function() {
        // Only stop if user initiated the scroll (not auto-scroll)
        if (Math.abs(floorplanWindow.scrollTop - lastScrollTop) > 2) {
          stopFloorplanAutoScroll();
        }
        lastScrollTop = floorplanWindow.scrollTop;
      });
      
      // Also stop on wheel/touch events
      floorplanWindow.addEventListener('wheel', stopFloorplanAutoScroll, { passive: true });
      floorplanWindow.addEventListener('touchstart', stopFloorplanAutoScroll, { passive: true });
    }
    
    // Detect user scroll on topview and stop auto-scroll
    if (topviewContent) {
      let lastScrollTop = 0;
      topviewContent.addEventListener('scroll', function() {
        // Only stop if user initiated the scroll (not auto-scroll)
        if (Math.abs(topviewContent.scrollTop - lastScrollTop) > 2) {
          stopTopviewAutoScroll();
        }
        lastScrollTop = topviewContent.scrollTop;
      });
      
      // Also stop on wheel/touch events
      topviewContent.addEventListener('wheel', stopTopviewAutoScroll, { passive: true });
      topviewContent.addEventListener('touchstart', stopTopviewAutoScroll, { passive: true });
    }
    
    // Start auto-scroll when windows become visible
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // Check floorplan window
          if (floorplanWindow && floorplanWindow.classList.contains('visible')) {
            // Reset scroll position to top
            floorplanWindow.scrollTop = 0;
            // Stop any existing auto-scroll
            stopFloorplanAutoScroll();
            // Start auto-scroll after window slides in
            setTimeout(() => startFloorplanAutoScroll(), 500);
          } else if (floorplanWindow && !floorplanWindow.classList.contains('visible')) {
            // Stop auto-scroll when window closes
            stopFloorplanAutoScroll();
          }
          
          // Check topview window
          const topviewWindow = document.querySelector('.topview-window');
          if (topviewWindow && topviewWindow.classList.contains('visible')) {
            // Reset scroll position to top
            if (topviewContent) {
              topviewContent.scrollTop = 0;
            }
            // Stop any existing auto-scroll
            stopTopviewAutoScroll();
            // Start auto-scroll after window slides in
            setTimeout(() => startTopviewAutoScroll(), 500);
          } else if (topviewWindow && !topviewWindow.classList.contains('visible')) {
            // Stop auto-scroll when window closes
            stopTopviewAutoScroll();
          }
        }
      });
    });
    
    // Observe both windows for class changes
    if (floorplanWindow) {
      observer.observe(floorplanWindow, { attributes: true });
    }
    
    const topviewWindow = document.querySelector('.topview-window');
    if (topviewWindow) {
      observer.observe(topviewWindow, { attributes: true });
    }
  })();
  
  function handleKeyPress(e) {
    let newX = playerX;
    let newY = playerY;
    let moved = false;
    
    const rowCount = floorPlan.length;
    const maxColCount = Math.max(...floorPlan.map(row => row.length));
    
    switch(e.key) {
      case 'ArrowUp':
        if (playerY > 0) {
          newY = playerY - 1;
        }
        break;
      case 'ArrowDown':
        if (playerY < rowCount - 1) {
          newY = playerY + 1;
        }
        break;
      case 'ArrowLeft':
        if (playerX > 0) {
          newX = playerX - 1;
        }
        break;
      case 'ArrowRight':
        if (playerX < maxColCount - 1) {
          newX = playerX + 1;
        }
        break;
    }
    
    // Check if new position is walkable (based on cellType configuration)
    if (newX !== playerX || newY !== playerY) {
      // Check if the cell exists in the array
      if (floorPlan[newY] && floorPlan[newY][newX] !== undefined) {
        const cellType = getCellType(floorPlan[newY][newX]);
        if (cellType && cellType.walkable) {
          playerX = newX;
          playerY = newY;
          moved = true;
        }
      }
    }
    
    if (moved) {
      e.preventDefault();
      updatePlayerPosition();
    }
  }
  
  // Initialize
  drawGrid();
  
  // Global function to redraw background grid based on current viewBox
  // DISABLED - not needed with massive initial grid
  window.redrawBackgroundGrid = function(viewX, viewY, viewW, viewH) {
    // Do nothing - initial massive grid is sufficient
    return;
  };
  
  // Zoom in to player with smooth JavaScript animation
  setTimeout(() => {
    const rowCount = floorPlan.length;
    const colCount = Math.max(...floorPlan.map(row => row.length));
    const viewBoxWidth = 1000;
    const viewBoxHeight = (rowCount / colCount) * viewBoxWidth;
    const cellWidth = viewBoxWidth / colCount;
    const cellHeight = viewBoxHeight / rowCount;
    
    // Starting viewBox (full map)
    const startX = 0;
    const startY = 0;
    const startWidth = viewBoxWidth;
    const startHeight = viewBoxHeight;
    
    // Ending viewBox (zoomed on player)
    const cameraWidth = viewBoxWidth / ZOOM_FACTOR;
    const cameraHeight = viewBoxHeight / ZOOM_FACTOR;
    const cameraCenterX = (playerX + 0.5) * cellWidth;
    const cameraCenterY = (playerY + 0.5) * cellHeight;
    const endX = Math.max(0, Math.min(viewBoxWidth - cameraWidth, cameraCenterX - cameraWidth / 2));
    const endY = Math.max(0, Math.min(viewBoxHeight - cameraHeight, cameraCenterY - cameraHeight / 2));
    const endWidth = cameraWidth;
    const endHeight = cameraHeight;
    
    // Animation parameters
    const duration = 3000; // 3 seconds
    const startTime = performance.now();
    
    // Easing function - smooth ease-in-out
    function easeInOutCubic(t) {
      return t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // Animation loop
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      
      // Interpolate viewBox values
      const currentX = startX + (endX - startX) * eased;
      const currentY = startY + (endY - startY) * eased;
      const currentWidth = startWidth + (endWidth - startWidth) * eased;
      const currentHeight = startHeight + (endHeight - startHeight) * eased;
      
      // Update viewBox
      gridSvg.setAttribute('viewBox', `${currentX} ${currentY} ${currentWidth} ${currentHeight}`);
      
      // Redraw background grid during animation to keep it visible
      if (window.redrawBackgroundGrid) {
        window.redrawBackgroundGrid(currentX, currentY, currentWidth, currentHeight);
      }
      
      // Continue animation if not finished
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Final redraw after animation completes to ensure grid stays visible
        if (window.redrawBackgroundGrid) {
          window.redrawBackgroundGrid(currentX, currentY, currentWidth, currentHeight);
        }
      }
    }
    
    // Start animation
    requestAnimationFrame(animate);
  }, 800); // Wait 800ms before starting zoom
  
  document.addEventListener('keydown', handleKeyPress);
  
  // Arrow button controls
  const arrowUp = document.querySelector('.arrow-up');
  const arrowDown = document.querySelector('.arrow-down');
  const arrowLeft = document.querySelector('.arrow-left');
  const arrowRight = document.querySelector('.arrow-right');
  
  if (arrowUp) {
    arrowUp.addEventListener('click', () => {
      handleKeyPress({ key: 'ArrowUp', preventDefault: () => {} });
    });
  }
  
  if (arrowDown) {
    arrowDown.addEventListener('click', () => {
      handleKeyPress({ key: 'ArrowDown', preventDefault: () => {} });
    });
  }
  
  if (arrowLeft) {
    arrowLeft.addEventListener('click', () => {
      handleKeyPress({ key: 'ArrowLeft', preventDefault: () => {} });
    });
  }
  
  if (arrowRight) {
    arrowRight.addEventListener('click', () => {
      handleKeyPress({ key: 'ArrowRight', preventDefault: () => {} });
    });
  }
  
  // Return to grid button functionality
  const returnBtn = document.getElementById('returnToGrid');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => {
      // Show warning screen with up-down animation (start hidden at bottom)
      warningScreen.style.display = 'flex';
      warningScreen.classList.remove('slide-up', 'slide-up-down');
      warningScreen.style.transform = 'translateY(100%)'; // Start hidden to prevent flash
      
      // Start animation immediately without delay
      requestAnimationFrame(() => {
        warningScreen.classList.add('slide-up-down');
        
        // Switch screens at the halfway point (1 second) when warning is fully covering
        setTimeout(() => {
          mainApp.classList.add('hidden');
          gridScreen.classList.remove('slide-up');
          gridScreen.style.display = 'flex';
          setTimeout(() => {
            gridScreen.classList.add('active');
          }, 10);
        }, 1000); // Switch at halfway point (1 second)
        
        // Hide warning after full animation completes
        setTimeout(() => {
          warningScreen.style.display = 'none';
          warningScreen.classList.remove('slide-up-down');
          warningScreen.style.transform = ''; // Reset transform
        }, 2000); // 2 second animation
      });
      
      // Reset player position to start
      playerX = 3;
      playerY = 1;
      updatePlayerPosition();
    });
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const tSlider = document.getElementById("t");
  const stuff = document.getElementById("stuffiness");
  const back = document.getElementById("back");
  const back2 = document.getElementById("back2");
  const L_arm_top = document.getElementById("L_arm_top");
  const L_arm_bot = document.getElementById("L_arm_bot");
  const R_arm_top = document.getElementById("R_arm_top");
  const R_arm_bot = document.getElementById("R_arm_bot");
  const L_far = document.getElementById("L_far");
  const R_far = document.getElementById("R_far");
  const L_diag_top = document.getElementById("L_diag_top");
  const R_diag_top = document.getElementById("R_diag_top");
  const L_diag_bot = document.getElementById("L_diag_bot");
  const R_diag_bot = document.getElementById("R_diag_bot");

  const base = {
    x: 490, y: 270, width: 420, height: 300,
    armTopY_L: 120, armBotY_L: 730,
    armTopY_R: 120, armBotY_R: 730,
    farLeftX: 365, farRightX: 1035,
    diagTopY: 100, diagBotY: 740,
  };

  const MIN_SHRINK = 0.35;

  function updateRoom(t) {
    const clampT = Math.max(0, Math.min(0.9, t));
    let shrink = 1 - clampT;
    shrink = Math.max(shrink, MIN_SHRINK);
    const newWidth = base.width * shrink;
    const newX = base.x + (base.width - newWidth) / 2;
    back.setAttribute("x", newX);
    back.setAttribute("width", newWidth);
    back2.setAttribute("x", newX + 15);
    back2.setAttribute("width", Math.max(0, newWidth - 30));
    const leftBackX = newX;
    const rightBackX = newX + newWidth;
    const inward = 100;
    const L_farX = base.farLeftX + clampT * inward;
    const R_farX = base.farRightX - clampT * inward;
    L_far.setAttribute("x1", L_farX);
    L_far.setAttribute("x2", L_farX);
    R_far.setAttribute("x1", R_farX);
    R_far.setAttribute("x2", R_farX);
    L_arm_top.setAttribute("x1", leftBackX);
    L_arm_top.setAttribute("y1", base.y);
    L_arm_top.setAttribute("x2", L_farX);
    L_arm_top.setAttribute("y2", base.armTopY_L);
    L_arm_bot.setAttribute("x1", leftBackX);
    L_arm_bot.setAttribute("y1", base.y + base.height);
    L_arm_bot.setAttribute("x2", L_farX);
    L_arm_bot.setAttribute("y2", base.armBotY_L);
    R_arm_top.setAttribute("x1", rightBackX);
    R_arm_top.setAttribute("y1", base.y);
    R_arm_top.setAttribute("x2", R_farX);
    R_arm_top.setAttribute("y2", base.armTopY_R);
    R_arm_bot.setAttribute("x1", rightBackX);
    R_arm_bot.setAttribute("y1", base.y + base.height);
    R_arm_bot.setAttribute("x2", R_farX);
    R_arm_bot.setAttribute("y2", base.armBotY_R);
    L_diag_top.setAttribute("x2", L_farX);
    L_diag_top.setAttribute("y2", base.diagTopY);
    R_diag_top.setAttribute("x2", R_farX);
    R_diag_top.setAttribute("y2", base.diagTopY);
    L_diag_bot.setAttribute("x2", L_farX);
    L_diag_bot.setAttribute("y2", base.diagBotY);
    R_diag_bot.setAttribute("x2", R_farX);
    R_diag_bot.setAttribute("y2", base.diagBotY);
  }

  let lastStuff = 0;
  const shownObjects = new Set();

  function updateStuffiness(v) {
    const clamped = Math.max(0, Math.min(1, v));
    const objects = document.querySelectorAll('.object-item');
    objects.forEach(obj => {
      const threshold = parseFloat(obj.dataset.threshold || 0);
      const objId = obj.id || obj.className;
      
      if (clamped >= threshold) {
        if (!shownObjects.has(objId)) {
          shownObjects.add(objId);
          
          if (obj.classList.contains('ladder')) {
            obj.dataset.draggable = '';
            obj.dataset.originalCenterX = '';
            obj.dataset.originalCenterY = '';
            obj.dataset.initialT = '';
            obj.dataset.dragX = '';
            obj.dataset.dragY = '';
            
            const currentT = parseFloat(tSlider.value) || 0;
            positionLadderInitially(obj, currentT);
            makeDraggable(obj);
            
            void obj.offsetHeight;
            
            obj.style.opacity = '1';
            obj.classList.remove('pop');
            void obj.offsetWidth;
            obj.classList.add('pop');
          } else {
            obj.style.opacity = '1';
            obj.classList.remove('pop');
            void obj.offsetWidth;
            obj.classList.add('pop');
            resetObjectPosition(obj);
            makeDraggable(obj);
          }
        } else {
          obj.style.opacity = '1';
        }
      } else {
        obj.style.opacity = '0';
        obj.classList.remove('pop');
        shownObjects.delete(objId);
        resetObjectPosition(obj);
        
        if (obj.classList.contains('ladder')) {
          obj.dataset.draggable = '';
          obj.dataset.originalWidth = '';
          obj.dataset.originalCenterX = '';
          obj.dataset.originalCenterY = '';
          obj.dataset.initialT = '';
        }
      }
    });
    lastStuff = clamped;
  }

  function resetObjectPosition(obj) {
    if (obj.classList.contains('ladder')) return;
    
    obj.style.transform = '';
    obj.dataset.dragX = '0';
    obj.dataset.dragY = '0';
  }

  function getBackWallBounds() {
    const roomEl = document.querySelector('.room');
    const backEl = document.getElementById('back');
    const backX = parseFloat(backEl.getAttribute('x'));
    const backWidth = parseFloat(backEl.getAttribute('width'));
    const backY = parseFloat(backEl.getAttribute('y'));
    const backHeight = parseFloat(backEl.getAttribute('height'));
    
    const roomRect = roomEl.getBoundingClientRect();
    const svgWidth = 1200;
    const svgHeight = 750;
    const scaleX = roomRect.width / svgWidth;
    const scaleY = roomRect.height / svgHeight;
    
    return {
      centerX: (backX + backWidth / 2) * scaleX,
      centerY: (backY + backHeight / 2) * scaleY,
      minY: backY * scaleY,
      maxY: (backY + backHeight) * scaleY
    };
  }

  function calculatePerspective(obj, posX, posY) {
    const bounds = getBackWallBounds();
    const roomEl = document.querySelector('.room');
    const roomRect = roomEl.getBoundingClientRect();
    
    const dx = posX - bounds.centerX;
    const dy = posY - bounds.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const maxDistance = roomRect.width * 0.5;
    const normalizedDist = Math.min(distance / maxDistance, 1);
    const scale = 0.5 + (normalizedDist * 0.7);
    const zIndex = Math.round(100 + normalizedDist * 900);
    
    return { scale, zIndex };
  }

  function positionLadderInitially(obj, currentT) {
    const roomEl = obj.closest('.room');
    const roomRect = roomEl.getBoundingClientRect();
    
    const backEl = document.getElementById('back');
    const backX = parseFloat(backEl.getAttribute('x'));
    const backWidth = parseFloat(backEl.getAttribute('width'));
    const backY = parseFloat(backEl.getAttribute('y'));
    const backHeight = parseFloat(backEl.getAttribute('height'));
    
    const svgWidth = 1200;
    const svgHeight = 750;
    const scaleX = roomRect.width / svgWidth;
    const scaleY = roomRect.height / svgHeight;
    
    const rightBackX = (backX + backWidth) * scaleX;
    const rightBackBotY = (backY + backHeight) * scaleY;
    
    const R_farX = parseFloat(document.getElementById('R_far').getAttribute('x1'));
    const R_farBotY = parseFloat(document.getElementById('R_arm_bot').getAttribute('y2'));
    const rightFarX = R_farX * scaleX;
    const rightFarBotY = R_farBotY * scaleY;
    
    const wallDx = rightFarX - rightBackX;
    const wallDy = rightFarBotY - rightBackBotY;
    
    const initialT = 0.08;
    obj.dataset.initialT = initialT;
    obj.dataset.maxT = 0.12;
    
    const snappedCenterX = rightBackX + initialT * wallDx;
    const snappedCenterY = rightBackBotY + initialT * wallDy;
    
    obj.dataset.originalCenterX = snappedCenterX;
    obj.dataset.originalCenterY = snappedCenterY;
    
    obj.style.left = `${snappedCenterX}px`;
    obj.style.top = `${snappedCenterY}px`;
    
    const computed = getComputedStyle(obj);
    const currentWidthPx = parseFloat(computed.width);
    const currentWidthPercent = (currentWidthPx / roomRect.width) * 100;
    
    const initialLadderScale = 0.7 + (initialT * 0.6);
    const baseWidth = currentWidthPercent / initialLadderScale;
    
    obj.dataset.originalWidth = baseWidth;
    obj.style.width = `${baseWidth * initialLadderScale}%`;
    
    const initialPerspective = calculatePerspective(obj, snappedCenterX, snappedCenterY);
    obj.style.zIndex = initialPerspective.zIndex;
  }

  function makeDraggable(obj) {
    if (obj.dataset.draggable === 'true') return;
    obj.dataset.draggable = 'true';
    
    const isLadder = obj.classList.contains('ladder');
    const isSign = obj.classList.contains('sign1-png') || obj.classList.contains('sign2-png') || 
                   obj.classList.contains('sign3-png') || obj.classList.contains('sign4-png');
    const isLight = obj.classList.contains('light-png');
    
    if (isLight) {
      return;
    }
    
    let isDragging = false;
    let startX, startY;
    let currentX = 0, currentY = 0;
    
    if (!obj.dataset.originalWidth && !isLadder) {
      const roomEl = obj.closest('.room');
      const roomRect = roomEl.getBoundingClientRect();
      const objRect = obj.getBoundingClientRect();
      const objCenterX = objRect.left + objRect.width / 2 - roomRect.left;
      const objCenterY = objRect.top + objRect.height / 2 - roomRect.top;
      
      const computed = getComputedStyle(obj);
      const currentWidthPx = parseFloat(computed.width);
      const currentWidthPercent = (currentWidthPx / roomRect.width) * 100;
      
      const initialPerspective = calculatePerspective(obj, objCenterX, objCenterY);
      const baseWidth = currentWidthPercent / initialPerspective.scale;
      obj.dataset.originalWidth = baseWidth;
      obj.dataset.originalCenterX = objCenterX;
      obj.dataset.originalCenterY = objCenterY;
      
      if (!isSign) {
        obj.style.zIndex = initialPerspective.zIndex;
      }
    }
    
    obj.addEventListener('mousedown', (e) => {
      if (obj.style.opacity === '0') return;
      isDragging = true;
      
      if (isLadder) {
        const currentDragY = parseFloat(obj.dataset.dragY) || 0;
        startY = e.clientY - currentDragY;
      } else {
        startX = e.clientX - (parseFloat(obj.dataset.dragX) || 0);
        startY = e.clientY - (parseFloat(obj.dataset.dragY) || 0);
      }
      
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const roomEl = obj.closest('.room');
      const roomRect = roomEl.getBoundingClientRect();
      const bounds = getBackWallBounds();
      
      if (isLadder) {
        const backEl = document.getElementById('back');
        const backX = parseFloat(backEl.getAttribute('x'));
        const backWidth = parseFloat(backEl.getAttribute('width'));
        const backY = parseFloat(backEl.getAttribute('y'));
        const backHeight = parseFloat(backEl.getAttribute('height'));
        
        const svgWidth = 1200;
        const svgHeight = 750;
        const scaleX = roomRect.width / svgWidth;
        const scaleY = roomRect.height / svgHeight;
        
        const rightBackX = (backX + backWidth) * scaleX;
        const rightBackBotY = (backY + backHeight) * scaleY;
        
        const R_farX = parseFloat(document.getElementById('R_far').getAttribute('x1'));
        const R_farBotY = parseFloat(document.getElementById('R_arm_bot').getAttribute('y2'));
        const rightFarX = R_farX * scaleX;
        const rightFarBotY = R_farBotY * scaleY;
        
        if (!obj.dataset.originalCenterX) {
          const objRect = obj.getBoundingClientRect();
          obj.dataset.originalCenterX = objRect.left + objRect.width / 2 - roomRect.left;
          obj.dataset.originalCenterY = objRect.top + objRect.height / 2 - roomRect.top;
        }
        
        const mouseDeltaY = e.clientY - startY;
        
        const wallDx = rightFarX - rightBackX;
        const wallDy = rightFarBotY - rightBackBotY;
        const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
        
        const parallelX = wallDx / wallLength;
        const parallelY = wallDy / wallLength;
        
        const moveAmount = mouseDeltaY;
        let testX = parallelX * moveAmount;
        let testY = parallelY * moveAmount;
        
        const testCenterX = parseFloat(obj.dataset.originalCenterX) + testX;
        const testCenterY = parseFloat(obj.dataset.originalCenterY) + testY;
        
        const originalCenterX = parseFloat(obj.dataset.originalCenterX);
        const originalCenterY = parseFloat(obj.dataset.originalCenterY);
        
        const toTestX = testCenterX - rightBackX;
        const toTestY = testCenterY - rightBackBotY;
        let t = (toTestX * wallDx + toTestY * wallDy) / (wallDx * wallDx + wallDy * wallDy);
        
        const maxT = parseFloat(obj.dataset.maxT) || 0.12;
        const minT = 0.0;
        
        t = Math.max(minT, Math.min(maxT, t));
        
        const clampedCenterX = rightBackX + t * wallDx;
        const clampedCenterY = rightBackBotY + t * wallDy;
        
        currentX = clampedCenterX - originalCenterX;
        currentY = clampedCenterY - originalCenterY;
        
        const objCenterX = originalCenterX + currentX;
        const objCenterY = originalCenterY + currentY;
        
        const ladderScale = 0.7 + (t * 0.6);
        
        const baseWidth = parseFloat(obj.dataset.originalWidth);
        obj.style.width = `${baseWidth * ladderScale}%`;
        
        const perspective = calculatePerspective(obj, objCenterX, objCenterY);
        obj.style.zIndex = perspective.zIndex;
      }
      else if (isSign) {
        // Determine which wall the sign is on
        const isLeftWall = obj.classList.contains('sign1-png') || obj.classList.contains('sign2-png');
        const isRightWall = obj.classList.contains('sign3-png') || obj.classList.contains('sign4-png');
        
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;
        
        if (isLeftWall) {
          // Get left wall outer boundaries (from corner to corner)
          const L_diagTopX = 0;
          const L_diagTopY = 0;
          const L_diagBotX = 0;
          const L_diagBotY = 750;
          
          const L_farX = parseFloat(document.getElementById('L_far').getAttribute('x1'));
          const L_farTopY = parseFloat(document.getElementById('L_diag_top').getAttribute('y2'));
          const L_farBotY = parseFloat(document.getElementById('L_diag_bot').getAttribute('y2'));
          
          const roomRect = roomEl.getBoundingClientRect();
          const svgWidth = 1200;
          const svgHeight = 750;
          const scaleX = roomRect.width / svgWidth;
          const scaleY = roomRect.height / svgHeight;
          
          // Convert to screen coordinates - outer left wall boundaries
          const leftCornerX = L_diagTopX * scaleX;
          const leftCornerTopY = L_diagTopY * scaleY;
          const leftCornerBotY = L_diagBotY * scaleY;
          const leftFarX = L_farX * scaleX;
          const leftFarTopY = L_farTopY * scaleY;
          const leftFarBotY = L_farBotY * scaleY;
          
          // Constrain horizontally between outer corner and far edge
          const originalCenterX = parseFloat(obj.dataset.originalCenterX);
          const newCenterX = originalCenterX + currentX;
          const clampedX = Math.max(leftCornerX, Math.min(leftFarX, newCenterX));
          currentX = clampedX - originalCenterX;
          
          // Constrain vertically between top and bottom corners
          const originalCenterY = parseFloat(obj.dataset.originalCenterY);
          const newCenterY = originalCenterY + currentY;
          const clampedY = Math.max(leftCornerTopY, Math.min(leftCornerBotY, newCenterY));
          currentY = clampedY - originalCenterY;
          
        } else if (isRightWall) {
          // Get right wall outer boundaries (from corner to corner)
          const R_diagTopX = 1200;
          const R_diagTopY = 0;
          const R_diagBotX = 1200;
          const R_diagBotY = 750;
          
          const R_farX = parseFloat(document.getElementById('R_far').getAttribute('x1'));
          const R_farTopY = parseFloat(document.getElementById('R_diag_top').getAttribute('y2'));
          const R_farBotY = parseFloat(document.getElementById('R_diag_bot').getAttribute('y2'));
          
          const roomRect = roomEl.getBoundingClientRect();
          const svgWidth = 1200;
          const svgHeight = 750;
          const scaleX = roomRect.width / svgWidth;
          const scaleY = roomRect.height / svgHeight;
          
          // Convert to screen coordinates - outer right wall boundaries
          const rightCornerX = R_diagTopX * scaleX;
          const rightCornerTopY = R_diagTopY * scaleY;
          const rightCornerBotY = R_diagBotY * scaleY;
          const rightFarX = R_farX * scaleX;
          const rightFarTopY = R_farTopY * scaleY;
          const rightFarBotY = R_farBotY * scaleY;
          
          // Constrain horizontally between far edge and outer corner
          const originalCenterX = parseFloat(obj.dataset.originalCenterX);
          const newCenterX = originalCenterX + currentX;
          const clampedX = Math.max(rightFarX, Math.min(rightCornerX, newCenterX));
          currentX = clampedX - originalCenterX;
          
          // Constrain vertically between top and bottom corners
          const originalCenterY = parseFloat(obj.dataset.originalCenterY);
          const newCenterY = originalCenterY + currentY;
          const clampedY = Math.max(rightCornerTopY, Math.min(rightCornerBotY, newCenterY));
          currentY = clampedY - originalCenterY;
        }
      }
      else {
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;
        
        const objRect = obj.getBoundingClientRect();
        const objCenterX = objRect.left + objRect.width / 2 - roomRect.left + currentX;
        const objCenterY = objRect.top + objRect.height / 2 - roomRect.top + currentY;
        
        const perspective = calculatePerspective(obj, objCenterX, objCenterY);
        
        const baseWidth = parseFloat(obj.dataset.originalWidth);
        obj.style.width = `${baseWidth * perspective.scale}%`;
        obj.style.zIndex = perspective.zIndex;
      }
      
      obj.dataset.dragX = currentX;
      obj.dataset.dragY = currentY;
      
      const baseTransform = isLadder ? 'translate(-50%, -50%)' : '';
      obj.style.transform = `${baseTransform} translate(${currentX}px, ${currentY}px)`;
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
      }
    });
    
    obj.style.pointerEvents = 'auto';
  }

  tSlider.addEventListener("input", e => {
    const t = parseFloat(e.target.value) || 0;
    updateRoom(t);
    updateLadderPosition(t);
    stopAnimation();
  });
  
  stuff.addEventListener("input", e => {
    const v = parseFloat(e.target.value) || 0;
    updateStuffiness(v);
  });

  function updateLadderPosition(t) {
    const ladder = document.querySelector('.ladder');
    if (!ladder || !ladder.dataset.draggable) return;
    
    const roomEl = ladder.closest('.room');
    if (!roomEl) return;
    
    const roomRect = roomEl.getBoundingClientRect();
    
    const backEl = document.getElementById('back');
    const backX = parseFloat(backEl.getAttribute('x'));
    const backWidth = parseFloat(backEl.getAttribute('width'));
    const backY = parseFloat(backEl.getAttribute('y'));
    const backHeight = parseFloat(backEl.getAttribute('height'));
    
    const svgWidth = 1200;
    const svgHeight = 750;
    const scaleX = roomRect.width / svgWidth;
    const scaleY = roomRect.height / svgHeight;
    
    const rightBackX = (backX + backWidth) * scaleX;
    const rightBackBotY = (backY + backHeight) * scaleY;
    
    const R_farX = parseFloat(document.getElementById('R_far').getAttribute('x1'));
    const R_farBotY = parseFloat(document.getElementById('R_arm_bot').getAttribute('y2'));
    const rightFarX = R_farX * scaleX;
    const rightFarBotY = R_farBotY * scaleY;
    
    const wallDx = rightFarX - rightBackX;
    const wallDy = rightFarBotY - rightBackBotY;
    
    let currentT = parseFloat(ladder.dataset.initialT) || 0.08;
    
    const dragX = parseFloat(ladder.dataset.dragX) || 0;
    const dragY = parseFloat(ladder.dataset.dragY) || 0;
    
    if (dragX !== 0 || dragY !== 0) {
      const originalCenterX = parseFloat(ladder.dataset.originalCenterX) || 0;
      const originalCenterY = parseFloat(ladder.dataset.originalCenterY) || 0;
      
      const currentCenterX = originalCenterX + dragX;
      const currentCenterY = originalCenterY + dragY;
      
      const toCurrentX = currentCenterX - rightBackX;
      const toCurrentY = currentCenterY - rightBackBotY;
      currentT = Math.max(0, Math.min(1, (toCurrentX * wallDx + toCurrentY * wallDy) / (wallDx * wallDx + wallDy * wallDy)));
    }
    
    const snappedCenterX = rightBackX + currentT * wallDx;
    const snappedCenterY = rightBackBotY + currentT * wallDy;
    
    const baseCenterX = rightBackX + (parseFloat(ladder.dataset.initialT) || 0.08) * wallDx;
    const baseCenterY = rightBackBotY + (parseFloat(ladder.dataset.initialT) || 0.08) * wallDy;
    
    const newDragX = snappedCenterX - baseCenterX;
    const newDragY = snappedCenterY - baseCenterY;
    
    ladder.dataset.originalCenterX = baseCenterX;
    ladder.dataset.originalCenterY = baseCenterY;
    
    ladder.dataset.dragX = newDragX;
    ladder.dataset.dragY = newDragY;
    
    ladder.style.left = `${baseCenterX}px`;
    ladder.style.top = `${baseCenterY}px`;
    ladder.style.transform = `translate(-50%, -50%) translate(${newDragX}px, ${newDragY}px)`;
    
    const ladderScale = 0.7 + (currentT * 0.6);
    const baseWidth = parseFloat(ladder.dataset.originalWidth);
    ladder.style.width = `${baseWidth * ladderScale}%`;
  }

  const t0 = parseFloat(tSlider.value) || 0;
  const s0 = parseFloat(stuff.value) || 0;
  updateRoom(t0);
  updateStuffiness(s0);

  let autoAnimating = true;
  let animationTime = 0;
  const animationDuration = 4;

  function autoAnimate() {
    if (!autoAnimating) return;
    animationTime += 1 / 60;
    const progress = (animationTime % animationDuration) / animationDuration;
    const sineWave = Math.sin(progress * Math.PI);
    const currentT = sineWave * 0.7;
    updateRoom(currentT);
    updateLadderPosition(currentT);
    updateChairPerspective();
    requestAnimationFrame(autoAnimate);
  }

  requestAnimationFrame(autoAnimate);

  const stopAnimation = () => {
    autoAnimating = false;
  };

  tSlider.addEventListener("mousedown", stopAnimation);
  tSlider.addEventListener("touchstart", stopAnimation);
  stuff.addEventListener("mousedown", stopAnimation);
  stuff.addEventListener("touchstart", stopAnimation);
  
  tSlider.addEventListener("input", () => {
    updateChairPerspective();
  });
});

(function() {
  const tintSwitch = document.getElementById('tintSwitch');
  const screenTint = document.getElementById('screenTint');
  
  if (!tintSwitch || !screenTint) return;
  
  // Hide only the text message, keep the tint overlay
  const tintMessage = screenTint.querySelector('.tint-message');
  if (tintMessage) {
    tintMessage.style.display = 'none';
  }
  
  // Ensure tint starts hidden
  document.body.classList.add('tint-off');
  
  tintSwitch.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    
    // When checked = switch is down = lights OFF = show tint
    if (isChecked) {
      document.body.classList.remove('tint-off');
      // Remove inline styles to let CSS take over
      screenTint.style.opacity = '';
      screenTint.style.visibility = '';
    } else {
      document.body.classList.add('tint-off');
      // Remove inline styles to let CSS take over
      screenTint.style.opacity = '';
      screenTint.style.visibility = '';
    }
  });
})();

(function() {
  const chairEl = document.querySelector('.chair');
  if (!chairEl) return;

  const chairOptions = [
    'chairathen1.png', 'chairathen2.png', 'chairathen3.png', 'chairathen4.png',
    'chairathen5.png', 'chairathen6.png', 'chairathen7.png', 'chairathen8.png'
  ];

  chairOptions.forEach(src => {
    const i = new Image();
    i.src = src;
  });

  let idx = chairOptions.findIndex(src => (chairEl.src || '').includes(src));
  if (idx < 0) idx = 0;
  
  // Variable to track if we're dragging or clicking
  let chairDragStarted = false;
  let chairClickStartX = 0;
  let chairClickStartY = 0;
  
  function getBackWallBounds() {
    const roomEl = document.querySelector('.room');
    const backEl = document.getElementById('back');
    const backX = parseFloat(backEl.getAttribute('x'));
    const backWidth = parseFloat(backEl.getAttribute('width'));
    const backY = parseFloat(backEl.getAttribute('y'));
    const backHeight = parseFloat(backEl.getAttribute('height'));
    
    const roomRect = roomEl.getBoundingClientRect();
    const svgWidth = 1200;
    const svgHeight = 750;
    const scaleX = roomRect.width / svgWidth;
    const scaleY = roomRect.height / svgHeight;
    
    return {
      centerX: (backX + backWidth / 2) * scaleX,
      centerY: (backY + backHeight / 2) * scaleY,
      minY: backY * scaleY,
      maxY: (backY + backHeight) * scaleY
    };
  }

  function calculatePerspective(posX, posY) {
    const bounds = getBackWallBounds();
    const roomEl = document.querySelector('.room');
    const roomRect = roomEl.getBoundingClientRect();
    
    const dx = posX - bounds.centerX;
    const dy = posY - bounds.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const maxDistance = roomRect.width * 0.5;
    const normalizedDist = Math.min(distance / maxDistance, 1);
    
    const scale = 0.5 + (normalizedDist * 0.7);
    const zIndex = Math.round(100 + normalizedDist * 900);
    
    return { scale, zIndex };
  }

  function getChairBaseWidth() {
    const src = chairEl.src || '';
    if (src.includes('chairathen1.png')) return 18;
    if (src.includes('chairathen2.png')) return 15;
    if (src.includes('chairathen3.png')) return 20;
    if (src.includes('chairathen4.png')) return 22;
    if (src.includes('chairathen5.png')) return 24;
    if (src.includes('chairathen6.png')) return 17;
    if (src.includes('chairathen7.png')) return 21;
    if (src.includes('chairathen8.png')) return 21;
    return 18;
  }
  
  function initializeChair() {
    const roomEl = chairEl.closest('.room');
    const roomRect = roomEl.getBoundingClientRect();
    
    // Only initialize if room has dimensions (is visible)
    if (roomRect.width === 0 || roomRect.height === 0) {
      return false;
    }
    
    const chairRect = chairEl.getBoundingClientRect();
    const chairCenterX = chairRect.left + chairRect.width / 2 - roomRect.left;
    const chairCenterY = chairRect.top + chairRect.height / 2 - roomRect.top;
    
    const currentWidthPx = parseFloat(getComputedStyle(chairEl).width);
    const currentWidthPercent = (currentWidthPx / roomRect.width) * 100;
    
    const initialPerspective = calculatePerspective(chairCenterX, chairCenterY);
    const baseWidth = currentWidthPercent / initialPerspective.scale;
    
    chairEl.dataset.originalWidth = baseWidth;
    chairEl.style.zIndex = initialPerspective.zIndex;
    return true;
  }
  
  // Try to initialize immediately
  if (!chairEl.dataset.originalWidth) {
    initializeChair();
  }
  
  let isDragging = false;
  let startX, startY;
  let currentX = 0, currentY = 0;
  
  chairEl.style.pointerEvents = 'auto';
  
  chairEl.addEventListener('mousedown', (e) => {
    chairDragStarted = false;
    chairClickStartX = e.clientX;
    chairClickStartY = e.clientY;
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    // Check if mouse has moved enough to be considered a drag
    const dragThreshold = 5; // pixels
    const deltaX = Math.abs(e.clientX - chairClickStartX);
    const deltaY = Math.abs(e.clientY - chairClickStartY);
    
    if (deltaX > dragThreshold || deltaY > dragThreshold) {
      chairDragStarted = true;
    }
    
    const roomEl = chairEl.closest('.room');
    const roomRect = roomEl.getBoundingClientRect();
    const bounds = getBackWallBounds();
    
    let newX = e.clientX - startX;
    let newY = e.clientY - startY;
    
    const chairRect = chairEl.getBoundingClientRect();
    const chairCenterX = chairRect.left + chairRect.width / 2 - roomRect.left + newX;
    const chairCenterY = chairRect.top + chairRect.height / 2 - roomRect.top + newY;
    
    currentX = newX;
    currentY = newY;
    
    const perspective = calculatePerspective(chairCenterX, chairCenterY);
    const baseWidth = parseFloat(chairEl.dataset.originalWidth);
    chairEl.style.width = `${baseWidth * perspective.scale}%`;
    chairEl.style.zIndex = perspective.zIndex;
    
    chairEl.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px))`;
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      // If it was a click (not a drag), cycle to the next chair
      if (!chairDragStarted) {
        idx = (idx + 1) % chairOptions.length;
        chairEl.src = chairOptions[idx];
        
        // Update the base width for the new chair
        const roomEl = chairEl.closest('.room');
        const roomRect = roomEl.getBoundingClientRect();
        const chairRect = chairEl.getBoundingClientRect();
        const chairCenterX = chairRect.left + chairRect.width / 2 - roomRect.left;
        const chairCenterY = chairRect.top + chairRect.height / 2 - roomRect.top;
        
        const currentWidthPx = parseFloat(getComputedStyle(chairEl).width);
        const currentWidthPercent = (currentWidthPx / roomRect.width) * 100;
        
        const currentPerspective = calculatePerspective(chairCenterX, chairCenterY);
        const baseWidth = currentWidthPercent / currentPerspective.scale;
        
        chairEl.dataset.originalWidth = baseWidth;
      }
      
      isDragging = false;
      chairDragStarted = false;
    }
  });
  
  // Function to update chair perspective when room changes
  window.updateChairPerspective = function() {
    // Initialize chair if not already done
    if (!chairEl.dataset.originalWidth) {
      if (!initializeChair()) {
        return; // Room not visible yet, can't initialize
      }
    }
    
    const roomEl = chairEl.closest('.room');
    const roomRect = roomEl.getBoundingClientRect();
    const chairRect = chairEl.getBoundingClientRect();
    
    // Calculate chair center position including any drag offset
    const chairCenterX = chairRect.left + chairRect.width / 2 - roomRect.left;
    const chairCenterY = chairRect.top + chairRect.height / 2 - roomRect.top;
    
    const perspective = calculatePerspective(chairCenterX, chairCenterY);
    const baseWidth = parseFloat(chairEl.dataset.originalWidth);
    chairEl.style.width = `${baseWidth * perspective.scale}%`;
    chairEl.style.zIndex = perspective.zIndex;
  };
  
  // Export initialization function globally
  window.initializeChair = initializeChair;
})();

(function() {
  const sign1 = document.querySelector('.sign1-png');
  const sign2 = document.querySelector('.sign2-png');
  const spaceSlider = document.getElementById('t');
  
  if (!spaceSlider) return;

  // SVG is 1200 units wide, walls move from farLeftX inward
  const SVG_WIDTH = 1200;
  const base = {
    farLeftX: 365,  // Starting position of left wall in SVG
    inward: 100     // How much wall moves inward per t value
  };
  
  function updateLeftSigns() {
    const t = parseFloat(spaceSlider.value) || 0;
    const clampT = Math.max(0, Math.min(0.9, t));
    
    // Calculate current left wall position in SVG coordinates
    const currentLeftWallX = base.farLeftX + clampT * base.inward;
    
    // Convert SVG coordinates to room percentage
    const leftWallPercent = (currentLeftWallX / SVG_WIDTH) * 100;
    
    // The left edge is at 0%, the left wall moves from 30.4% to 38.75%
    // Signs should stay between 0% (edge) and leftWallPercent (wall)
    
    // Sign 1: positioned between edge and wall, closer to wall
    if (sign1) {
      // Keep sign1 at 50% distance from edge to wall
      const sign1Percent = Math.max(0, leftWallPercent * 0.5);
      sign1.style.left = `${sign1Percent}%`;
      sign1.style.right = 'auto';
    }
    
    // Sign 2: positioned between edge and wall, closer to edge  
    if (sign2) {
      // Keep sign2 at 30% distance from edge to wall
      const sign2Percent = Math.max(0, leftWallPercent * 0.3);
      sign2.style.right = 'auto';
      sign2.style.left = `${sign2Percent}%`;
    }
  }
  
  spaceSlider.addEventListener('input', updateLeftSigns);
  updateLeftSigns(); // Initialize immediately
  setTimeout(updateLeftSigns, 100);
})();

(function() {
  const sign3 = document.querySelector('.sign3-png');
  const sign4 = document.querySelector('.sign4-png');
  const stool1 = document.querySelector('.stool1-png');
  const spaceSlider = document.getElementById('t');
  
  if (!spaceSlider) return;

  // SVG is 1200 units wide, walls move from farRightX inward
  const SVG_WIDTH = 1200;
  const base = {
    farRightX: 1035, // Starting position of right wall in SVG
    inward: 100      // How much wall moves inward per t value
  };
  
  function updateRightObjects() {
    const t = parseFloat(spaceSlider.value) || 0;
    const clampT = Math.max(0, Math.min(0.9, t));
    
    // Calculate current right wall position in SVG coordinates
    const currentRightWallX = base.farRightX - clampT * base.inward;
    
    // Convert SVG coordinates to room percentage from right edge
    const rightWallPercent = ((SVG_WIDTH - currentRightWallX) / SVG_WIDTH) * 100;
    
    // The right edge is at 0%, the right wall moves from 13.75% to 22.08%
    // Signs should stay between 0% (edge) and rightWallPercent (wall)
    
    // Sign 3: positioned between edge and wall, closer to wall
    if (sign3) {
      // Keep sign3 at 50% distance from edge to wall
      const sign3Percent = Math.max(0, rightWallPercent * 0.5);
      sign3.style.right = `${sign3Percent}%`;
      sign3.style.left = 'auto';
    }
    
    // Sign 4: positioned between edge and wall, very close to edge
    if (sign4) {
      // Keep sign4 at 20% distance from edge to wall
      const sign4Percent = Math.max(0, rightWallPercent * 0.2);
      sign4.style.right = `${sign4Percent}%`;
      sign4.style.left = 'auto';
    }
    
    // Stool 1: positioned between edge and wall, moderate distance
    if (stool1) {
      // Keep stool1 at 40% distance from edge to wall
      const stool1Percent = Math.max(0, rightWallPercent * 0.4);
      stool1.style.right = `${stool1Percent}%`;
      stool1.style.left = 'auto';
    }
  }
  
  spaceSlider.addEventListener('input', updateRightObjects);
  updateRightObjects(); // Initialize immediately
  setTimeout(updateRightObjects, 100);
})();

(function() {
  const targets = document.querySelectorAll('.hover-split-target');
  targets.forEach(label => {
    if (label.dataset.split === '1') return;
    label.dataset.split = '1';
    const textNode = Array.from(label.childNodes).find(
      n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim().length
    );
    if (!textNode) return;
    const raw = textNode.nodeValue;
    const text = raw.trim();
    const wrap = document.createElement('span');
    wrap.className = 'hover-split';
    const chars = [...text];
    
    chars.forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      s.style.animationDelay = `${Math.random() * 2}s`;
      wrap.appendChild(s);
    });
    
    label.insertBefore(wrap, textNode);
    label.removeChild(textNode);
  });
  
  setTimeout(() => {
    const tintMessage = document.querySelector('.tint-message');
    if (tintMessage && !tintMessage.dataset.split) {
      tintMessage.dataset.split = '1';
      const paragraphs = tintMessage.querySelectorAll('p');
      
      paragraphs.forEach(p => {
        const originalText = p.textContent.trim();
        p.innerHTML = '';
        
        [...originalText].forEach((ch, i) => {
          const span = document.createElement('span');
          span.className = 'ch';
          span.textContent = ch;
          span.style.animationDelay = `${Math.random() * 2}s`;
          p.appendChild(span);
        });
      });
    }
  }, 50);
  
  setTimeout(() => {
    document.body.classList.add('is-ready');
  }, 100);
})();

function enhanceTitleFloat() {
  const el = document.getElementById("floatingTitle");
  if (!el) return;
  if (!el.querySelector(".ch")) {
    const frag = document.createDocumentFragment();
    for (const ch of el.textContent) {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = ch;
      frag.appendChild(s);
    }
    el.textContent = "";
    el.appendChild(frag);
  }
  const letters = [...el.querySelectorAll(".ch")];
  const BOUNDS_X = 34;
  const BOUNDS_Y = 26;
  const ROT_BOUNDS = 10;
  const ACCEL = 18;
  const VMAX = 16;
  const RACCEL = 18;
  const RVMAX = 14;
  const state = letters.map(() => ({
    x: (Math.random() * 2 - 1) * (BOUNDS_X * 0.6),
    y: (Math.random() * 2 - 1) * (BOUNDS_Y * 0.6),
    r: (Math.random() * 2 - 1) * (ROT_BOUNDS * 0.6),
    vx: (Math.random() * 2 - 1) * (VMAX * 0.4),
    vy: (Math.random() * 2 - 1) * (VMAX * 0.4),
    vr: (Math.random() * 2 - 1) * (RVMAX * 0.3),
    locked: false,
    homeX: 0,
    homeY: 0,
    homeR: 0,
  }));
  setTimeout(() => {
    letters.forEach((ch, i) => {
      state[i].homeX = state[i].x;
      state[i].homeY = state[i].y;
      state[i].homeR = state[i].r;
    });
  }, 100);
  letters.forEach((ch, i) => {
    ch.addEventListener("mouseenter", () => {
      state[i].locked = true;
      state[i].x = 0;
      state[i].y = 0;
      state[i].r = 0;
      state[i].vx = 0;
      state[i].vy = 0;
      state[i].vr = 0;
    });
    ch.addEventListener("mouseleave", () => {
      state[i].vx = (Math.random() * 2 - 1) * (VMAX * 0.9);
      state[i].vy = (Math.random() * 2 - 1) * (VMAX * 0.9);
      state[i].vr = (Math.random() * 2 - 1) * (RVMAX * 0.9);
      state[i].locked = false;
    });
  });
  let last = performance.now();

  function step(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    letters.forEach((ch, i) => {
      const s = state[i];
      if (!s.locked) {
        s.vx += (Math.random() * 2 - 1) * ACCEL * dt;
        s.vy += (Math.random() * 2 - 1) * ACCEL * dt;
        s.vr += (Math.random() * 2 - 1) * RACCEL * dt;
        const clamp = (v, m) => Math.max(-m, Math.min(m, v));
        s.vx = clamp(s.vx, VMAX);
        s.vy = clamp(s.vy, VMAX);
        s.vr = clamp(s.vr, RVMAX);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.r += s.vr * dt;
        if (Math.abs(s.x) > BOUNDS_X) {
          s.x = Math.sign(s.x) * BOUNDS_X;
          s.vx *= -0.85;
        }
        if (Math.abs(s.y) > BOUNDS_Y) {
          s.y = Math.sign(s.y) * BOUNDS_Y;
          s.vy *= -0.85;
        }
        if (Math.abs(s.r) > ROT_BOUNDS) {
          s.r = Math.sign(s.r) * ROT_BOUNDS;
          s.vr *= -0.85;
        }
      }
      ch.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px) rotate(${s.r.toFixed(2)}deg)`;
    });
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  document.body.classList.add("is-ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    enhanceTitleFloat();
  }, { once: true });
} else {
  enhanceTitleFloat();
}

(function() {
  const panel = document.querySelector('.resizable-panel');
  const app = document.querySelector('.app');
  
  if (!panel || !app) return;
  
  // Set fixed width - calculate based on window width
  const windowWidth = window.innerWidth;
  const fixedWidth = windowWidth - 150 - 800; // Same calculation as before, but fixed
  
  panel.style.width = `${fixedWidth}px`;
  app.style.gridTemplateColumns = `${fixedWidth}px 1fr minmax(800px, 1fr)`;
  panel.classList.add('expanded');
})();

// Custom cursor - initialize after app is ready
window.initCustomCursor = function() {
  const cursor = document.querySelector('.custom-cursor');
  if (!cursor) return;
  
  // Only add mousemove listener once
  if (!window.cursorMouseMoveAdded) {
    window.cursorMouseMoveAdded = true;
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animateCursor() {
      cursorX += (mouseX - cursorX) * 0.1;
      cursorY += (mouseY - cursorY) * 0.1;
      cursor.style.left = (cursorX - 20) + 'px';
      cursor.style.top = (cursorY - 20) + 'px';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();
  }
  
  // Always update interactive elements in case new ones were added
  const interactiveElements = document.querySelectorAll('a, button, input, .light-switch, .resize-handle, .floating-title .ch, .hover-split, [type="range"], .chair, .ladder, .object-item');
  
  interactiveElements.forEach(el => {
    // Remove old listeners if any
    el.removeEventListener('mouseenter', el._cursorEnter);
    el.removeEventListener('mouseleave', el._cursorLeave);
    
    // Add new listeners
    el._cursorEnter = () => cursor.classList.add('hover');
    el._cursorLeave = () => cursor.classList.remove('hover');
    
    el.addEventListener('mouseenter', el._cursorEnter);
    el.addEventListener('mouseleave', el._cursorLeave);
  });
};

// Initialize cursor after a short delay to ensure everything is loaded
setTimeout(() => {
  window.initCustomCursor();
}, 100);

// Show instruction text when sliders are used
(function() {
  const instructionText = document.querySelector('.room-instruction-text');
  const spaceSlider = document.getElementById('t');
  const stuffinessSlider = document.getElementById('stuffiness');
  const tintSwitch = document.getElementById('tintSwitch');
  
  if (!instructionText) return;
  
  let hideTimeout;
  let hasShownOnce = false; // Track if instruction has been shown
  
  function showInstruction() {
    // Only show if it hasn't been shown before
    if (hasShownOnce) return;
    
    // Mark as shown
    hasShownOnce = true;
    
    // Clear any existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    
    // Show the text
    instructionText.classList.add('visible');
    
    // Hide after 3 seconds
    hideTimeout = setTimeout(() => {
      instructionText.classList.remove('visible');
    }, 3000);
  }
  
  // Add event listeners to all sliders
  if (spaceSlider) {
    spaceSlider.addEventListener('input', showInstruction);
  }
  
  if (stuffinessSlider) {
    stuffinessSlider.addEventListener('input', showInstruction);
  }
  
  if (tintSwitch) {
    tintSwitch.addEventListener('change', showInstruction);
  }
})();