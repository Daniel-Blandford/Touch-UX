const {Gio, St, Clutter, GObject, Meta, Shell} = imports.gi;
const Main = imports.ui.main;
const Keyboard = imports.ui.keyboard;
const InputSourceManager = imports.ui.status.keyboard;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const UPower = imports.gi.UPowerGlib;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Me = Extension;

let settings;

let pMonitor;
let statusBarButton;
let gestureBar, gestureContainer;
let gestureBarWidth = 128;
let gestureBarHeight = 8;
let gestureContainerVPadding = 16;
let animDuration = 150;

function init() {
    settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.touch-ux");    
    pMonitor = Main.layoutManager.primaryMonitor;
    gestureBarWidth = (pMonitor.width * settings.get_int("gesture-bar-width")) / 100;
    gestureBarHeight = ((pMonitor.height * settings.get_int("gesture-bar-height")) / 100)/4;
    
    gestureContainer = new GestureContainer();
    gestureBar = new GestureBar();
}

function enable() {
    let chromeSettingsIntegrate = {
        affectsInputRegion : true,
        affectsStruts : true,
        trackFullscreen : true,
    };
    let chromeSettingsFloat = {
        affectsInputRegion : true,
        affectsStruts : false,
        trackFullscreen : true,
    };
    Main.layoutManager.addChrome(gestureContainer, chromeSettingsIntegrate);
    Main.layoutManager.addChrome(gestureBar, chromeSettingsFloat);
    

    // Set up the indicator in the status area
    if (settings.get_boolean("show-statusbar-icon")) {
            statusBarButton = new StatusBarButton();
            Main.panel.addToStatusArea('statusBarButton', statusBarButton, 1);
    }
    
    settings.connect("changed::show-statusbar-icon", function () {
        if (settings.get_boolean("show-statusbar-icon")) {
            statusBarButton = new StatusBarButton();
            Main.panel.addToStatusArea('statusBarButton', statusBarButton, 1);
        }
        else {
            statusBarButton.destroy();
        }
    });
}

function disable() {
    Main.layoutManager.removeChrome(gestureContainer);
    Main.layoutManager.removeChrome(gestureBar);
    statusBarButton.destroy();
}

const GestureContainer = GObject.registerClass(
    class GestureContainer extends St.Bin {
        _init () {
            super._init({
                style_class : 'gesture-container',
                reactive : true,
                can_focus : false,
                track_hover : true,
                width : pMonitor.width,
                height : gestureBarHeight+gestureContainerVPadding,
                x : 0,
                y : pMonitor.height - gestureBarHeight - gestureContainerVPadding,
            });
        }
    }
);

const GestureBar = GObject.registerClass(
    class GestureBar extends St.Bin {
        _init () {
            super._init({
                style_class : 'gesture-bar',
                reactive : true,
                can_focus : true,
                track_hover : true,
                width : gestureBarWidth,
                height : gestureBarHeight,
                x : (pMonitor.width/2)-(gestureBarWidth/2),
                y : pMonitor.height - gestureBarHeight - (gestureContainerVPadding/2),
            });
            
            settings.connect("changed::gesture-bar-height", () => {
                gestureBarHeight = ((pMonitor.height * settings.get_int("gesture-bar-height")) / 100)/4;
                this.set_height(gestureBarHeight);
                gestureContainer.set_height(gestureBarHeight+gestureContainerVPadding)
                gestureBar.set_position((pMonitor.width/2)-(gestureBarWidth/2), pMonitor.height - gestureBarHeight - (gestureContainerVPadding/2)); 
            });
            
            settings.connect("changed::gesture-bar-width", () => {
                gestureBarWidth = (pMonitor.width * settings.get_int("gesture-bar-width")) / 100;
                this.set_width(gestureBarWidth);
                gestureBar.set_position((pMonitor.width/2)-(gestureBarWidth/2), pMonitor.height - gestureBarHeight - (gestureContainerVPadding/2)); 
            });
            
            
            this.connect("touch-event", (actor, event)=> {//Visual feedback on touch input
                let xPos, yPos;
                [xPos, yPos] = event.get_coords();
                if(yPos > pMonitor.height - gestureBarHeight - gestureContainerVPadding){
                    gestureBar.set_position(xPos-(gestureBarWidth/2), yPos-(gestureBarHeight-2)); }
            });
            
            this.connect("leave-event", (actor, event)=> {//Not the ideal approach, but enables the swipe gesture event to work as expected from an end user perspective until a better solution is implemented.
                
                //If the gesture goes above the gesture container zone, show/hide overview
                let [xPos, yPos] = event.get_coords();
                if(yPos < pMonitor.height - gestureBarHeight - (gestureContainerVPadding/2))
                {
                    if (Main.overview.visible) {
                        Main.overview.hide();
                    } else {
                        Main.overview.show();
                    }
                }
                
                //Animate gestureBar back to default position
                let newX = (pMonitor.width/2)-(gestureBarWidth/2);
                let newY = pMonitor.height - gestureBarHeight - (gestureContainerVPadding/2);
                gestureBar.ease({
                    x: newX,
                    y: newY,
                    duration: animDuration,
                    mode: Clutter.AnimationMode.EASE_OUT_BOUNCE
                });
            });
        }
    }
);

function toggleOSK() {
    if (Main.keyboard._keyboardVisible) {
        Main.keyboard.close();
    }
    else {
        Main.keyboard.open(Main.layoutManager.bottomIndex);
    }
}

const StatusBarButton = GObject.registerClass(
    class StatusBarButton extends PanelMenu.Button {
        _init () {
            super._init(0);
            //Status bar item/icon
            let icon = new St.Icon({
                icon_name: 'input-keyboard-symbolic',
                style_class : 'system-status-icon',
            });
            this.add_child(icon);
            
            //Show on screen keyboard menu item
            let pmItem = new PopupMenu.PopupMenuItem('Show keyboard');
            this.menu.addMenuItem(pmItem);
            pmItem.connect('activate', () => {
                //When toggle OSK is called directly from the dropdown menu it doesn't always display the OSK, but with a timeout wrapper set to '0' it fixes the bug (I know... WTF?)
                this._toggleOskTimeoutBugFix = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 0, () => {
                    toggleOSK();
                });
            });
            
            //Menu divider:
            this.menu.addMenuItem( new PopupMenu.PopupSeparatorMenuItem() );
            
            //Launch extension settings menu item
            let settingsItem = new PopupMenu.PopupMenuItem('Settings');
            this.menu.addMenuItem(settingsItem);
            settingsItem.connect('activate', () => {
                ExtensionUtils.openPrefs();
            });
        }
    }
);