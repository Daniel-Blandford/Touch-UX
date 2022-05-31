"use strict";

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {}

function buildPrefsWidget() {
  let settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.touch-ux")

  let prefsWidget = new Gtk.Grid({
    margin_top: 16,
    margin_bottom: 16,
    margin_start: 16,
    margin_end: 16,
    column_spacing: 16,
    row_spacing: 16,
    visible: true,
  });

  let labelGestureBarHeight = new Gtk.Label({
    label: "Gesture bar height:",
    halign: Gtk.Align.START,
    visible: true,
  });
  prefsWidget.attach(labelGestureBarHeight, 0, 0, 1, 1);

  let inputGestureBarHeight = new Gtk.SpinButton();
  inputGestureBarHeight.set_range(1, 100);
  inputGestureBarHeight.set_sensitive(true);
  inputGestureBarHeight.set_increments(1, 10);
  prefsWidget.attach(inputGestureBarHeight, 1, 0, 1, 1);
  inputGestureBarHeight.set_value(settings.get_int("gesture-bar-height"));
  inputGestureBarHeight.connect("value-changed", (widget) => {
    settings.set_int("gesture-bar-height", widget.get_value_as_int());
  });
  settings.connect("changed::gesture-bar-height", () => {
    inputGestureBarHeight.set_value(settings.get_int("gesture-bar-height"));
  });

  let labelGestureBarWidth = new Gtk.Label({
    label: "Gesture bar width:",
    halign: Gtk.Align.START,
    visible: true,
  });
  prefsWidget.attach(labelGestureBarWidth, 0, 1, 1, 1);

  let inputGestureBarWidth = new Gtk.SpinButton();
  inputGestureBarWidth.set_range(1, 100);
  inputGestureBarWidth.set_sensitive(true);
  inputGestureBarWidth.set_increments(1, 10);
  prefsWidget.attach(inputGestureBarWidth, 1, 1, 1, 1);
  inputGestureBarWidth.set_value(settings.get_int("gesture-bar-width"));
  inputGestureBarWidth.connect("value-changed", (widget) => {
    settings.set_int("gesture-bar-width", widget.get_value_as_int());
  });
  settings.connect("changed::gesture-bar-width", () => {
    inputGestureBarWidth.set_value(settings.get_int("gesture-bar-width"));
  });

  let labelShowStatusbarIcon = new Gtk.Label({
    label: "Show status bar icon",
    halign: Gtk.Align.START,
    visible: true,
  });

  let inputShowStatusbarIcon = new Gtk.CheckButton({
    label: "active",
  });
  inputShowStatusbarIcon.set_active(
    settings.get_boolean("show-statusbar-icon")
  );
  inputShowStatusbarIcon.connect("toggled", (widget) => {
    settings.set_boolean("show-statusbar-icon", widget.get_active());
  });
  settings.connect("changed::show-statusbar-icon", () => {
    inputShowStatusbarIcon.set_active(
      settings.get_boolean("show-statusbar-icon")
    );
  });
  prefsWidget.attach(inputShowStatusbarIcon, 1, 4, 1, 1);
  prefsWidget.attach(labelShowStatusbarIcon, 0, 4, 1, 1);
    
  prefsWidget.show();

  return prefsWidget;
}
