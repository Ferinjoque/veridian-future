// game.js
import {
    GRID_CELL_SIZE, GRID_ROWS, GRID_COLS, GAME_WIDTH, GAME_HEIGHT,
    GRID_AREA_HEIGHT, // Import this if defined in config
    BUILDING_BLUEPRINTS, FONT_FAMILY, UI_COLORS,
    FONT_STYLE_RESOURCES, FONT_STYLE_BUTTON_BASE, FONT_STYLE_TOOLTIP
} from './config.js';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });

        this.gridData = []; // Renamed from 'grid' to avoid conflict with Phaser's grid object if any
        this.placedBuildings = [];
        this.currentEnergy = 200;
        this.currentWater = 200;
        this.currentPopulation = 0;
        this.maxPopulation = 0;
        this.currentCredits = 1000;
        this.airQuality = 100;

        this.selectedBuildingKey = null;
        this.ghostBuildingSprite = null;
        this.uiElements = {
            resourceTexts: {},
            buildButtons: {}, // Will store { container, graphics, text, width, height }
            tooltipContainer: null,
            tooltipText: null,
            tooltipBg: null,
            uiPanelGraphics: null // For the main UI panel background
        };
        this.resourceUpdateTimer = null;
    }

    preload() {
        this.load.image('solar_panel_sprite', 'assets/solar_panel.png');
        this.load.image('house_sprite', 'assets/house.png');
        this.load.image('water_collector_sprite', 'assets/water_collector.png');
        this.load.image('grid_cell_tile', 'assets/grid_cell.png'); // Opaque ground tile
        this.load.image('game_background_main', 'assets/game_background.png'); // Thematic forest background
    }

    create() {
        // 1. Add the main thematic background image to cover the ENTIRE canvas
        this.add.image(0, 0, 'game_background_main') // Position at top-left
            .setOrigin(0, 0)                         // Set origin to top-left
            .setDisplaySize(GAME_WIDTH, GAME_HEIGHT) // Scale to fill the entire game canvas
            .setDepth(-100);                         // Send it to the very back

        this.initLogicalGrid();
        this.createVisualGrid();    // Draws opaque ground tiles over the game area part of the main background

        this.createUIPanel();       // Draws UI panel over the UI area part of the main background
        this.createResourceDisplays();
        this.createBuildButtons();
        this.createTooltip();
        this.initInputHandling();
        this.initResourceGeneration();

        this.updateAllResourceDisplays();
    }

    update(time, delta) {
        if (this.selectedBuildingKey && this.ghostBuildingSprite) { // Ensure ghost sprite exists
            this.updateGhostBuilding();
        }
    }

    initLogicalGrid() {
        this.gridData = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            this.gridData[r] = [];
            for (let c = 0; c < GRID_COLS; c++) {
                this.gridData[r][c] = null;
            }
        }
    }

    createVisualGrid() {
        // Opaque ground tiles for the playable grid area
        // These are drawn on top of the 'game_background_main' in the grid portion.
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                this.add.image(c * GRID_CELL_SIZE, r * GRID_CELL_SIZE, 'grid_cell_tile')
                    .setOrigin(0, 0)
                    .setAlpha(1) // Opaque ground tiles
                    .setDepth(-10); // Above main background, below buildings
            }
        }
    }

    createUIPanel() {
        // Calculate UI panel position and height based on config
        const uiPanelActualHeight = GAME_HEIGHT - (GRID_ROWS * GRID_CELL_SIZE); // Use GRID_ROWS * GRID_CELL_SIZE for grid area height
        const uiPanelY = GRID_ROWS * GRID_CELL_SIZE;

        this.uiElements.uiPanelGraphics = this.add.graphics();
        // Use the PANEL_BACKGROUND color. Alpha controls how much of the main thematic background shows through.
        this.uiElements.uiPanelGraphics.fillStyle(UI_COLORS.PANEL_BACKGROUND, 0.92);
        this.uiElements.uiPanelGraphics.fillRect(0, uiPanelY, GAME_WIDTH, uiPanelActualHeight);
        this.uiElements.uiPanelGraphics.setDepth(0); // Above game area backgrounds, below actual UI elements

        let topBorder = this.add.graphics({ lineStyle: { width: 1, color: UI_COLORS.PANEL_BORDER_TOP } });
        topBorder.strokeLineShape(new Phaser.Geom.Line(0, uiPanelY, GAME_WIDTH, uiPanelY));
        topBorder.setDepth(1); // Border on top of panel fill
    }

    createResourceDisplays() {
        const panelTopY = GRID_ROWS * GRID_CELL_SIZE;
        const PADDING_INTERNAL = 25;
        const resourceTextStartY = panelTopY + PADDING_INTERNAL;
        const col1X = PADDING_INTERNAL;
        const col2X = GAME_WIDTH / 2 + PADDING_INTERNAL / 2;
        const lineSpacing = 28;

        // Create text objects and add them to uiElements.resourceTexts
        this.uiElements.resourceTexts.energy = this.add.text(col1X, resourceTextStartY, '', FONT_STYLE_RESOURCES).setDepth(2);
        this.uiElements.resourceTexts.water = this.add.text(col1X, resourceTextStartY + lineSpacing, '', FONT_STYLE_RESOURCES).setDepth(2);
        this.uiElements.resourceTexts.credits = this.add.text(col1X, resourceTextStartY + lineSpacing * 2, '', FONT_STYLE_RESOURCES).setDepth(2);
        this.uiElements.resourceTexts.population = this.add.text(col2X, resourceTextStartY, '', FONT_STYLE_RESOURCES).setDepth(2);
        this.uiElements.resourceTexts.airQuality = this.add.text(col2X, resourceTextStartY + lineSpacing, '', FONT_STYLE_RESOURCES).setDepth(2);
    }

    createBuildButtons() {
        const PADDING_INTERNAL = 25;
        const buttonHeight = 40;
        const approxStatsHeight = 20 + (28 * 2); // Y where last stat text ends relative to panel top
        const buttonYOffsetFromStats = 35;
        const buttonCenterY = GRID_ROWS * GRID_CELL_SIZE + approxStatsHeight + buttonYOffsetFromStats + buttonHeight / 2;

        let currentButtonStartX = PADDING_INTERNAL;

        Object.keys(BUILDING_BLUEPRINTS).forEach(buildingKey => {
            const blueprint = BUILDING_BLUEPRINTS[buildingKey];
            const minButtonWidth = 110;
            const textPadding = 30;
            const textEstimatedWidth = this.calculateTextWidth(blueprint.name, FONT_STYLE_BUTTON_BASE);
            const buttonWidth = Math.max(minButtonWidth, textEstimatedWidth + textPadding);

            const buttonContainerX = currentButtonStartX + buttonWidth / 2;
            const buttonContainer = this.add.container(buttonContainerX, buttonCenterY).setDepth(2);

            const buttonGraphics = this.add.graphics();
            buttonGraphics.fillStyle(UI_COLORS.BUTTON_BG_NORMAL, 1);
            buttonGraphics.fillRoundedRect(-(buttonWidth / 2), -(buttonHeight / 2), buttonWidth, buttonHeight, UI_COLORS.BUTTON_BORDER_RADIUS);

            const buttonText = this.add.text(0, 0, blueprint.name, FONT_STYLE_BUTTON_BASE).setOrigin(0.5, 0.5);

            buttonContainer.add([buttonGraphics, buttonText]);
            buttonContainer.setSize(buttonWidth, buttonHeight); // CRITICAL for hit area
            buttonContainer.setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    console.log('Button clicked:', blueprint.name); // DEBUG
                    if (this.selectedBuildingKey === buildingKey) {
                        this.deselectBuilding();
                    } else {
                        this.setSelectedBuilding(buildingKey);
                    }
                })
                .on('pointerover', (pointer) => {
                    // console.log('Button hover:', blueprint.name); // DEBUG
                    if (this.selectedBuildingKey !== buildingKey) {
                        buttonGraphics.clear().fillStyle(UI_COLORS.BUTTON_BG_HOVER, 1).fillRoundedRect(-(buttonWidth / 2), -(buttonHeight / 2), buttonWidth, buttonHeight, UI_COLORS.BUTTON_BORDER_RADIUS);
                    }
                    this.showTooltip(pointer, blueprint, buttonContainer);
                })
                .on('pointerout', () => {
                    // console.log('Button out:', blueprint.name); // DEBUG
                    if (this.selectedBuildingKey !== buildingKey) {
                        buttonGraphics.clear().fillStyle(UI_COLORS.BUTTON_BG_NORMAL, 1).fillRoundedRect(-(buttonWidth / 2), -(buttonHeight / 2), buttonWidth, buttonHeight, UI_COLORS.BUTTON_BORDER_RADIUS);
                    }
                    this.hideTooltip();
                });

            this.uiElements.buildButtons[buildingKey] = { container: buttonContainer, graphics: buttonGraphics, text: buttonText, width: buttonWidth, height: buttonHeight };
            currentButtonStartX += buttonWidth + 15;
        });
    }

    calculateTextWidth(text, style) {
        let tempText = this.add.text(0, -1000, text, style).setVisible(false); // Position off-screen
        let width = tempText.width;
        tempText.destroy();
        return width;
    }

    createTooltip() {
        const tooltipPadding = FONT_STYLE_TOOLTIP.padding || { x: 8, y: 5 }; // Default padding
        this.uiElements.tooltipContainer = this.add.container(0, 0).setVisible(false).setDepth(30); // Highest depth

        this.uiElements.tooltipBg = this.add.graphics();
        this.uiElements.tooltipContainer.add(this.uiElements.tooltipBg);

        this.uiElements.tooltipText = this.add.text(tooltipPadding.x, tooltipPadding.y, '', FONT_STYLE_TOOLTIP);
        this.uiElements.tooltipContainer.add(this.uiElements.tooltipText);
    }

    initInputHandling() {
        // Ghost building sprite setup
        this.ghostBuildingSprite = this.add.sprite(0, 0, '') // Texture set on selection
            .setAlpha(0.6)
            .setOrigin(0.5, 0.5)
            .setVisible(false)
            .setDepth(5); // Above buildings, below top UI elements

        this.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                this.deselectBuilding();
            } else if (pointer.leftButtonDown() && this.selectedBuildingKey) {
                // Check if clicking on the grid area
                if (pointer.y < GRID_ROWS * GRID_CELL_SIZE && pointer.y > 0 && pointer.x > 0 && pointer.x < GAME_WIDTH) {
                    const col = Math.floor(pointer.worldX / GRID_CELL_SIZE);
                    const row = Math.floor(pointer.worldY / GRID_CELL_SIZE);
                    this.tryPlaceBuilding(row, col);
                }
            }
        });

        this.input.keyboard.on('keydown-ESC', () => {
            this.deselectBuilding();
        });
    }

    updateAllResourceDisplays() {
        this.uiElements.resourceTexts.energy.setText(`Energy: ${this.currentEnergy}`);
        this.uiElements.resourceTexts.water.setText(`Water: ${this.currentWater}`);
        this.uiElements.resourceTexts.credits.setText(`Credits: ${this.currentCredits}`);
        this.uiElements.resourceTexts.population.setText(`Pop: ${this.currentPopulation} / ${this.maxPopulation}`);
        this.uiElements.resourceTexts.airQuality.setText(`Air Q: ${this.airQuality}%`);
    }

    setSelectedBuilding(buildingKey) {
        console.log("setSelectedBuilding called with:", buildingKey); // DEBUG
        this.selectedBuildingKey = buildingKey;
        if (BUILDING_BLUEPRINTS[buildingKey] && this.ghostBuildingSprite) {
            this.ghostBuildingSprite.setTexture(BUILDING_BLUEPRINTS[buildingKey].key).setVisible(true);
        } else if (this.ghostBuildingSprite) {
            this.ghostBuildingSprite.setVisible(false); // Hide if blueprint/key is invalid
        }


        for (const key in this.uiElements.buildButtons) {
            const buttonData = this.uiElements.buildButtons[key];
            const bgColor = (key === buildingKey) ? UI_COLORS.BUTTON_BG_ACTIVE : UI_COLORS.BUTTON_BG_NORMAL;
            buttonData.graphics.clear().fillStyle(bgColor, 1).fillRoundedRect(-(buttonData.width / 2), -(buttonData.height / 2), buttonData.width, buttonData.height, UI_COLORS.BUTTON_BORDER_RADIUS);
        }
    }

    deselectBuilding() {
        console.log("deselectBuilding called"); // DEBUG
        this.selectedBuildingKey = null;
        if (this.ghostBuildingSprite) {
            this.ghostBuildingSprite.setVisible(false);
        }

        for (const key in this.uiElements.buildButtons) {
            const buttonData = this.uiElements.buildButtons[key];
            buttonData.graphics.clear().fillStyle(UI_COLORS.BUTTON_BG_NORMAL, 1).fillRoundedRect(-(buttonData.width / 2), -(buttonData.height / 2), buttonData.width, buttonData.height, UI_COLORS.BUTTON_BORDER_RADIUS);
        }
        this.hideTooltip();
    }

    updateGhostBuilding() {
        const pointer = this.input.activePointer;
        const col = Math.floor(pointer.worldX / GRID_CELL_SIZE);
        const row = Math.floor(pointer.worldY / GRID_CELL_SIZE);

        if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS &&
            pointer.y < GRID_ROWS * GRID_CELL_SIZE) { // Ensure cursor is over grid area
            this.ghostBuildingSprite.setPosition(
                col * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
                row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
            );
            // Make sure it's visible if a building is selected
            if (this.selectedBuildingKey) this.ghostBuildingSprite.setVisible(true);

            const tintColor = this.isValidPlacement(row, col, this.selectedBuildingKey) ? UI_COLORS.VALID_PLACEMENT_TINT : UI_COLORS.INVALID_PLACEMENT_TINT;
            this.ghostBuildingSprite.setTint(tintColor);
        } else {
            this.ghostBuildingSprite.setVisible(false);
        }
    }

    isValidPlacement(row, col, buildingKey) {
        if (!buildingKey) return false; // No building selected
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false;
        if (this.gridData[row][col] !== null) return false; // Changed from this.grid

        const blueprint = BUILDING_BLUEPRINTS[buildingKey];
        if (!blueprint) return false;
        if (this.currentCredits < blueprint.cost.credits) return false;
        if (this.currentEnergy < (blueprint.cost.energy || 0)) return false;
        return true;
    }

    tryPlaceBuilding(row, col) {
        if (!this.selectedBuildingKey) return;
        if (this.isValidPlacement(row, col, this.selectedBuildingKey)) {
            const blueprint = BUILDING_BLUEPRINTS[this.selectedBuildingKey];
            this.currentCredits -= blueprint.cost.credits;
            this.currentEnergy -= (blueprint.cost.energy || 0);

            const buildingSprite = this.add.sprite(
                col * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
                row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
                blueprint.key
            ).setOrigin(0.5, 0.5).setDepth(1); // Depth 1 for buildings

            const buildingData = { row, col, type: this.selectedBuildingKey, sprite: buildingSprite, blueprint };
            this.gridData[row][col] = buildingData; // Changed from this.grid
            this.placedBuildings.push(buildingData);

            buildingSprite.setScale(0.6).setAlpha(0.4);
            this.tweens.add({ targets: buildingSprite, scale: 1, alpha: 1, ease: 'Cubic.easeOut', duration: 250 });

            if (blueprint.produces && blueprint.produces.population) {
                this.maxPopulation += blueprint.produces.population;
            }
            this.updateAllResourceDisplays();
            this.deselectBuilding(); // Deselect after successful placement
        } else {
            this.cameras.main.shake(100, 0.005);
        }
    }

    showTooltip(pointer, blueprint, buttonElement) {
        if (!this.uiElements.tooltipContainer || !this.uiElements.tooltipText || !this.uiElements.tooltipBg) return;

        let content = [`${blueprint.name.toUpperCase()}`];
        content.push(`Cost: ${blueprint.cost.credits} Cr` + ((blueprint.cost.energy || 0) > 0 ? `, ${blueprint.cost.energy} E` : ''));
        if (Object.keys(blueprint.produces).length > 0) {
            Object.entries(blueprint.produces).forEach(([res, val]) => content.push(`Out: +${val} ${res}/s`));
        }
        if (Object.keys(blueprint.consumes).length > 0) {
            Object.entries(blueprint.consumes).forEach(([res, val]) => content.push(`In: -${val} ${res}/s`));
        }
        content.push(`\n"${blueprint.description}"`);
        this.uiElements.tooltipText.setText(content.join('\n'));

        const textMetrics = this.uiElements.tooltipText;
        const tooltipPadding = FONT_STYLE_TOOLTIP.padding || { x: 8, y: 5 };
        const bgWidth = textMetrics.width + tooltipPadding.x * 2;
        const bgHeight = textMetrics.height + tooltipPadding.y * 2;

        this.uiElements.tooltipBg.clear()
            .fillStyle(UI_COLORS.TOOLTIP_BG, 0.95)
            .fillRoundedRect(0, 0, bgWidth, bgHeight, 6); // x,y relative to container (0,0)

        // Position tooltipText correctly within its container (it's already added at tooltipPadding.x,y)

        this.uiElements.tooltipContainer.setVisible(true);

        let newX = buttonElement.x - bgWidth / 2; // Center tooltip with button center
        let newY = buttonElement.y - buttonElement.height / 2 - bgHeight - 10; // Above button

        const margin = 5;
        if (newX < margin) newX = margin;
        if (newX + bgWidth > GAME_WIDTH - margin) newX = GAME_WIDTH - margin - bgWidth;
        if (newY < margin) {
            newY = buttonElement.y + buttonElement.height / 2 + 10;
            if (newY + bgHeight > GAME_HEIGHT - margin) newY = GAME_HEIGHT - margin - bgHeight;
        }
        this.uiElements.tooltipContainer.setPosition(newX, newY);
    }

    hideTooltip() {
        if (this.uiElements.tooltipContainer) this.uiElements.tooltipContainer.setVisible(false);
    }

    initResourceGeneration() {
        this.resourceUpdateTimer = this.time.addEvent({ delay: 1000, callback: this.updateResourcesPerSecond, callbackScope: this, loop: true });
    }

    updateResourcesPerSecond() {
        let netEnergyChange = 0;
        let netWaterChange = 0;

        this.placedBuildings.forEach(building => {
            const blueprint = building.blueprint;
            let canOperate = true;

            if (blueprint.consumes) {
                if ((blueprint.consumes.energy || 0) > 0 && this.currentEnergy < (blueprint.consumes.energy || 0)) canOperate = false;
                if ((blueprint.consumes.water || 0) > 0 && this.currentWater < (blueprint.consumes.water || 0)) canOperate = false;
            }

            if (canOperate) {
                if (blueprint.produces) {
                    netEnergyChange += blueprint.produces.energy || 0;
                    netWaterChange += blueprint.produces.water || 0;
                }
                if (blueprint.consumes) {
                    netEnergyChange -= blueprint.consumes.energy || 0;
                    netWaterChange -= blueprint.consumes.water || 0;
                }
                building.sprite.clearTint();
            } else {
                building.sprite.setTint(UI_COLORS.INVALID_PLACEMENT_TINT);
            }
        });

        this.currentEnergy = Math.max(0, this.currentEnergy + netEnergyChange);
        this.currentWater = Math.max(0, this.currentWater + netWaterChange);
        this.updateAllResourceDisplays();
    }
}

// Ensure UI_COLORS.GAME_CANVAS_BACKGROUND is defined in config.js
// For example: GAME_CANVAS_BACKGROUND: '#1E1E1F',
const gameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    // This backgroundColor is for the canvas element itself, seen if Phaser doesn't draw anything over it
    // or if your main background image fails to load.
    backgroundColor: UI_COLORS.PAGE_BACKGROUND, // Or a very dark fallback like '#000000'
    scene: [MainScene],
    render: {
        pixelArt: false,
        antialias: true,
    },
    parent: 'phaser-game-container' // Optional div id
};

const game = new Phaser.Game(gameConfig);