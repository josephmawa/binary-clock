const { St, Clutter, GLib } = imports.gi;

const ExtUtils = imports.misc.extensionUtils;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Me = ExtUtils.getCurrentExtension();
const BCDModule = Me.imports.bcd;

let USE_24_HRS = null;

class Extension {
  constructor() {}

  enable() {
    this.timerId = null;
    this.panelBtn = new PanelMenu.Button(0.0, Me.metadata.name, false);

    this.settings = ExtUtils.getSettings();
    this.timeFormatHandler();
    this.settings.connect(
      "changed::twenty-four-hour-format",
      this.timeFormatHandler,
    );

    const icon = new St.Icon({
      icon_name: "emoji-recent-symbolic",
      style_class: "system-status-icon",
    });
    this.panelBtn.add_child(icon);

    const section = new PopupMenu.PopupMenuSection();
    const parentBox = new St.BoxLayout({
      vertical: false,
      style: "spacing: 10px;",
      style_class: "main-box",
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER,
    });

    this.hourBox = new BCDModule.Hour({ hour: 0 });
    this.minuteBox = new BCDModule.MinutesOrSeconds({ value: 0 });
    this.secondBox = new BCDModule.MinutesOrSeconds({ value: 0 });

    parentBox.add_child(this.hourBox);
    parentBox.add_child(this.minuteBox);
    parentBox.add_child(this.secondBox);

    section.actor.add_child(parentBox);
    this.panelBtn.menu.addMenuItem(section);

    const separator = new PopupMenu.PopupSeparatorMenuItem();
    this.panelBtn.menu.addMenuItem(separator);

    const prefsSection = new PopupMenu.PopupMenuSection();
    const prefsItem = new PopupMenu.PopupImageMenuItem(
      "Preferences",
      "preferences-system-symbolic",
    );
    prefsItem.connect("activate", () => {
      ExtUtils.openPrefs();
    });
    prefsItem.setOrnament(PopupMenu.Ornament.HIDDEN);

    const prefsBox = new St.BoxLayout({
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER,
    });
    prefsBox.add_child(prefsItem);

    prefsSection.actor.add_child(prefsBox);
    this.panelBtn.menu.addMenuItem(prefsSection);

    this.panelBtn.menu.connect("open-state-changed", (paneBtn, isOpen) => {
      this.intervalHandler();
      if (isOpen) {
        this.timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
          this.intervalHandler();
          return GLib.SOURCE_CONTINUE;
        });
      } else {
        if (this.timerId) {
          GLib.Source.remove(this.timerId);
          this.timerId = null;
        }
      }
    });

    Main.panel.addToStatusArea(Me.metadata.uuid, this.panelBtn, 0);
  }

  timeFormatHandler = () => {
    if (!this.settings) this.settings = ExtUtils.getSettings();
    USE_24_HRS = this.settings.get_boolean("twenty-four-hour-format");
  };

  intervalHandler = () => {
    const date = new Date();
    let hours = date.getHours();
    if (USE_24_HRS === false && hours > 12) {
      hours = hours - 12;
    }

    this.hourBox.setHour(hours);
    this.minuteBox.setValue(date.getMinutes());
    this.secondBox.setValue(date.getSeconds());
  };

  disable() {
    if (this.timerId) {
      GLib.Source.remove(this.timerId);
      this.timerId = null;
    }

    if (this.hourBox) {
      this.hourBox.destroy();
      this.hourBox = null;
    }

    if (this.minuteBox) {
      this.minuteBox.destroy();
      this.minuteBox = null;
    }

    if (this.secondBox) {
      this.secondBox.destroy();
      this.secondBox = null;
    }

    if (this.panelBtn) {
      this.panelBtn.destroy();
      this.panelBtn = null;
    }

    if (USE_24_HRS !== null) {
      USE_24_HRS = null;
    }
  }
}

function init() {
  return new Extension();
}
