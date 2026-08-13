const { St, Clutter, GLib, Gio } = imports.gi;

const ExtUtils = imports.misc.extensionUtils;
const { gettext: _ } = ExtUtils;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Me = ExtUtils.getCurrentExtension();
const BCDModule = Me.imports.bcd;

let CLOCK_TYPE = null;
let DISPLAY_NUMERIC_CLOCK_BCD = null;
let NUMERIC_CLOCK_FORMAT_BCD = null;
let DISPLAY_NUMERIC_CLOCK_BIN = null;
let NUMERIC_CLOCK_FORMAT_BIN = null;

const SEC_MS = 1000;
const MIN_MS = 60 * SEC_MS;
const HOUR_MS = 60 * MIN_MS;
const DAY_MS = 24 * HOUR_MS;
const DURATION = DAY_MS / 2 ** 16;

class Extension {
  constructor() {}

  enable() {
    // Panel menu button
    this.panelBtn = new PanelMenu.Button(0.0, Me.metadata.name, false);

    const iconFile = Me.dir.get_child("emoji-recent-symbolic.svg");
    const gicon = new Gio.FileIcon({ file: iconFile });
    const icon = new St.Icon({
      gicon: gicon,
      style_class: "system-status-icon",
      icon_size: 16,
    });

    this.panelBtn.add_child(icon);
    Main.panel.addToStatusArea(Me.metadata.uuid, this.panelBtn, 0);

    // Binary Clock UI
    const section = new PopupMenu.PopupMenuSection();
    this.panelBtn.menu.addMenuItem(section);

    const parentBox = new St.BoxLayout({
      vertical: false,
      style_class: "main-box",
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER,
    });
    section.actor.add_child(parentBox);

    this._binWrapper = new St.Bin();
    parentBox.add_child(this._binWrapper);

    // Section separator
    const separator = new PopupMenu.PopupSeparatorMenuItem();
    this.panelBtn.menu.addMenuItem(separator);

    // Preferences section
    const prefsSection = new PopupMenu.PopupMenuSection();
    const prefsItem = new PopupMenu.PopupImageMenuItem(
      _("Preferences"),
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

    // Bind settings
    this.bindSettings();
    // Creates UIs which are added to the dropdown as settings change
    this.createBinClock();
    this.createBCDclock();
    // Call this method after creating Binary and BCD clocks
    this.createUI();

    this.panelBtn.menu.connect("open-state-changed", (panelBtn, isOpen) => {
      if (isOpen) {
        this.createUI();
      }

      if (CLOCK_TYPE === "bin" && isOpen) {
        this.binaryClockHandler();
        return;
      }

      if (CLOCK_TYPE === "bin" && !isOpen) {
        clearTimeout(this._timeOutId);
        this._timeOutId = null;
        return;
      }

      if (CLOCK_TYPE === "bcd" && isOpen) {
        this.bcdClockHandler();
        this._setIntervalId = GLib.timeout_add(
          GLib.PRIORITY_DEFAULT,
          1000,
          () => {
            this.bcdClockHandler();
            return GLib.SOURCE_CONTINUE;
          },
        );
        return;
      }

      if (CLOCK_TYPE === "bcd" && !isOpen) {
        if (this._setIntervalId) {
          GLib.Source.remove(this._setIntervalId);
          this._setIntervalId = null;
        }
      }
    });
  }

  createUI() {
    if (this._timeOutId) {
      clearTimeout(this._timeOutId);
      this._timeOutId = null;
    }

    if (this._setIntervalId) {
      GLib.Source.remove(this._setIntervalId);
      this._setIntervalId = null;
    }

    const clockType = this.settings.get_string("clock-type");
    if (clockType === "bcd") {
      this._binWrapper.set_child(this.bcdClock);
    } else if (clockType === "bin") {
      this._binWrapper.set_child(this._binaryClock);
    } else {
      throw new Error("Unknown clock-type string setting");
    }
  }

  createBinClock() {
    this._timeOutId = null;
    this._binaryClock = new BCDModule.BinaryClock();
  }

  bindSettings() {
    this.settings = ExtUtils.getSettings();

    this.clockTypeHandler();
    this.settings.connect("changed::clock-type", () => {
      this.clockTypeHandler();
    });

    this.displayNumericClockBcdHandler();
    this.settings.connect("changed::display-numeric-clock-bcd", () => {
      this.displayNumericClockBcdHandler();
    });

    this.numericClockFormatBcdHandler();
    this.settings.connect("changed::numeric-clock-format-bcd", () => {
      this.numericClockFormatBcdHandler();
    });

    this.displayNumericClockBin();
    this.settings.connect("changed::display-numeric-clock-bin", () => {
      this.displayNumericClockBin();
    });

    this.numericClockFormatBinHandler();
    this.settings.connect("changed::numeric-clock-format-bin", () => {
      this.numericClockFormatBinHandler();
    });
  }

  clockTypeHandler = () => {
    CLOCK_TYPE = this.settings.get_string("clock-type");
  };

  displayNumericClockBcdHandler = () => {
    DISPLAY_NUMERIC_CLOCK_BCD = this.settings.get_boolean(
      "display-numeric-clock-bcd",
    );
  };

  numericClockFormatBcdHandler = () => {
    NUMERIC_CLOCK_FORMAT_BCD = this.settings.get_string(
      "numeric-clock-format-bcd",
    );
  };

  displayNumericClockBin = () => {
    DISPLAY_NUMERIC_CLOCK_BIN = this.settings.get_boolean(
      "display-numeric-clock-bin",
    );
  };

  numericClockFormatBinHandler = () => {
    NUMERIC_CLOCK_FORMAT_BIN = this.settings.get_string(
      "numeric-clock-format-bin",
    );
  };

  createBCDclock() {
    this._setIntervalId = null;

    this.bcdClock = new St.BoxLayout({
      vertical: false,
      style: "spacing: 10px;",
      style_class: "main-box",
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER,
    });

    this.hourBox = new BCDModule.Hour({ hour: 0 });
    this.minuteBox = new BCDModule.MinutesOrSeconds({ value: 0 });
    this.secondBox = new BCDModule.MinutesOrSeconds({ value: 0 });

    this.bcdClock.add_child(this.hourBox);
    this.bcdClock.add_child(this.minuteBox);
    this.bcdClock.add_child(this.secondBox);
  }

  bcdClockHandler = () => {
    const date = new Date();
    let hours = date.getHours();
    if (NUMERIC_CLOCK_FORMAT_BCD === "twelve-hr-format" && hours > 12) {
      hours = hours - 12;
    }

    this.hourBox.setHour(hours);
    this.minuteBox.setValue(date.getMinutes());
    this.secondBox.setValue(date.getSeconds());
  };

  binaryClockHandler = () => {
    const date = new Date();
    const hrs = date.getHours();
    const min = date.getMinutes();
    const sec = date.getSeconds();
    const mil = date.getMilliseconds();

    const msElapsed = hrs * HOUR_MS + min * MIN_MS + sec * SEC_MS + mil;

    const ratio = msElapsed / DAY_MS;
    const clockBin = BCDModule.convertToBinClock(ratio);
    this._binaryClock.setBinClock(clockBin);

    if (DISPLAY_NUMERIC_CLOCK_BIN === true) {
      let displayClock = clockBin;
      if (NUMERIC_CLOCK_FORMAT_BIN === "dec") {
        displayClock = parseInt(clockBin, 2).toString(10);
      }
      this._binaryClock.setBinClockLabel(displayClock);
    }

    const msLeft = DURATION - (msElapsed % DURATION);
    this._timeOutId = setTimeout(this.binaryClockHandler, msLeft);
  };

  disable() {
    if (this._setIntervalId) {
      GLib.Source.remove(this._setIntervalId);
      this._setIntervalId = null;
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
  }
}

function init() {
  ExtUtils.initTranslations();
  return new Extension();
}
