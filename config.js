// config.js
export const GRID_CELL_SIZE = 64;
export const GRID_ROWS = 8;
export const GRID_COLS = 10;
export const GRID_AREA_HEIGHT = GRID_ROWS * GRID_CELL_SIZE; // Height of the playable grid
export const UI_PANEL_HEIGHT = 180; // Desired height of your UI panel

export const GAME_WIDTH = GRID_COLS * GRID_CELL_SIZE;
export const GAME_HEIGHT = GRID_AREA_HEIGHT + UI_PANEL_HEIGHT; // Total canvas height

export const BUILDING_BLUEPRINTS = {
    solar_panel: {
        key: 'solar_panel_sprite',
        name: 'Solar Panel',
        cost: { energy: 0, credits: 50 },
        produces: { energy: 5 },
        consumes: {},
        description: "Generates clean energy from sunlight."
    },
    house: {
        key: 'house_sprite',
        name: 'Eco-Dwelling',
        cost: { energy: 10, credits: 100 },
        produces: { population: 5 },
        consumes: { energy: 1, water: 1 },
        description: "Provides shelter for your citizens."
    },
    water_collector: {
        key: 'water_collector_sprite',
        name: 'Water Collector',
        cost: { energy: 5, credits: 75 },
        produces: { water: 10 },
        consumes: {},
        description: "Harvests and purifies atmospheric water."
    }
};

export const FONT_FAMILY = 'Montserrat, Arial, sans-serif';

export const UI_COLORS = {
    PAGE_BACKGROUND: '#121212',
    GAME_CANVAS_BACKGROUND: '#1E1E1F', // Will be covered by the thematic image
    PANEL_BACKGROUND: 0x282C34,
    PANEL_BORDER_TOP: 0x383C44,
    TEXT_PRIMARY: '#EAEAEA',
    TEXT_SECONDARY: '#A0A0A0',
    TEXT_BUTTON: '#FFFFFF',
    BUTTON_BG_NORMAL: 0x3A3F4B, // Numerical for fillStyle
    BUTTON_BG_HOVER: 0x4A4F5B,  // Numerical for fillStyle
    BUTTON_BG_ACTIVE: 0x00BFA5, // Numerical for fillStyle (Vibrant Green)
    BUTTON_BORDER_RADIUS: 6,
    TOOLTIP_BG: 0x3A3F4B,       // Numerical for fillStyle
    TOOLTIP_TEXT: '#EAEAEA',
    VALID_PLACEMENT_TINT: 0x32CD32,
    INVALID_PLACEMENT_TINT: 0xFF6347,
    ICON_COLOR: '#00BFA5',
};

export const FONT_STYLE_RESOURCES = { fontSize: '17px', fill: UI_COLORS.TEXT_PRIMARY, fontFamily: FONT_FAMILY };
export const FONT_STYLE_BUTTON_BASE = { fontSize: '15px', fill: UI_COLORS.TEXT_BUTTON, fontFamily: FONT_FAMILY };
export const FONT_STYLE_TOOLTIP = {
    fontSize: '13px',
    fill: UI_COLORS.TOOLTIP_TEXT,
    padding: { x: 10, y: 6 }, // Increased padding
    fontFamily: FONT_FAMILY,
    wordWrap: { width: 220 },
    align: 'left'
};