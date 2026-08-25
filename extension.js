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
let DISPLAY_NUMERIC_CLOCK_BIN = null;
let NUMERIC_CLOCK_FORMAT_BCD = null;
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
    this._panelBtn = new PanelMenu.Button(0.0, Me.metadata.name, false);

    const iconFile = Me.dir.get_child("emoji-recent-symbolic.svg");
    const gicon = new Gio.FileIcon({ file: iconFile });
    const icon = new St.Icon({
      gicon: gicon,
      style_class: "system-status-icon",
      icon_size: 16,
    });

    this._panelBtn.add_child(icon);
    Main.panel.addToStatusArea(Me.metadata.uuid, this._panelBtn, 0);

    // Binary Clock UI
    const section = new PopupMenu.PopupMenuSection();
    this._panelBtn.menu.addMenuItem(section);

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
    this._panelBtn.menu.addMenuItem(separator);

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
    this._panelBtn.menu.addMenuItem(prefsSection);

    this.bindSettings();
    this.createBinClock();
    this.createBCDclock();
    // Call this method after creating Binary and BCD clocks
    this.createUI();

    this._openStateChangedHandlerId = this._panelBtn.menu.connect(
      "open-state-changed",
      this.openStateChangedHandler,
    );
  }

  createUI() {
    if (this._setTimeOutId) {
      clearTimeout(this._setTimeOutId);
      this._setTimeOutId = null;
    }

    if (this._setIntervalId) {
      clearInterval(this._setIntervalId);
      this._setIntervalId = null;
    }

    const clockType = this._settings.get_string("clock-type");
    if (clockType === "bcd") {
      this._binWrapper.set_child(this._bcdClock);
    } else if (clockType === "bin") {
      this._binWrapper.set_child(this._binaryClock);
    } else {
      throw new Error("Unknown clock-type string setting");
    }
  }

  createBinClock() {
    this._setTimeOutId = null;
    this._binaryClock = new BCDModule.BinaryClock();
  }

  bindSettings() {
    this._settings = ExtUtils.getSettings();

    this.clockTypeHandler();
    this._settings.connectObject(
      "changed::clock-type",
      () => this.clockTypeHandler(),
      this,
    );

    this.displayNumericClockBcdHandler();
    this._settings.connectObject(
      "changed::display-numeric-clock-bcd",
      () => this.displayNumericClockBcdHandler(),
      this,
    );

    this.numericClockFormatBcdHandler();
    this._settings.connectObject(
      "changed::numeric-clock-format-bcd",
      () => this.numericClockFormatBcdHandler(),
      this,
    );

    this.displayNumericClockBin();
    this._settings.connectObject(
      "changed::display-numeric-clock-bin",
      () => this.displayNumericClockBin(),
      this,
    );

    this.numericClockFormatBinHandler();
    this._settings.connectObject(
      "changed::numeric-clock-format-bin",
      () => this.numericClockFormatBinHandler(),
      this,
    );
  }

  clockTypeHandler = () => {
    CLOCK_TYPE = this._settings.get_string("clock-type");
  };

  displayNumericClockBcdHandler = () => {
    DISPLAY_NUMERIC_CLOCK_BCD = this._settings.get_boolean(
      "display-numeric-clock-bcd",
    );
  };

  numericClockFormatBcdHandler = () => {
    NUMERIC_CLOCK_FORMAT_BCD = this._settings.get_string(
      "numeric-clock-format-bcd",
    );
  };

  displayNumericClockBin = () => {
    DISPLAY_NUMERIC_CLOCK_BIN = this._settings.get_boolean(
      "display-numeric-clock-bin",
    );
  };

  numericClockFormatBinHandler = () => {
    NUMERIC_CLOCK_FORMAT_BIN = this._settings.get_string(
      "numeric-clock-format-bin",
    );
  };

  openStateChangedHandler = (_panelBtn, isOpen) => {
    if (isOpen) {
      this.createUI();
    }

    if (CLOCK_TYPE === "bin" && isOpen) {
      this.binaryClockHandler();
      return;
    }

    if (CLOCK_TYPE === "bin" && !isOpen) {
      clearTimeout(this._setTimeOutId);
      this._setTimeOutId = null;
      return;
    }

    if (CLOCK_TYPE === "bcd" && isOpen) {
      this.bcdClockHandler();
      this._setIntervalId = setInterval(this.bcdClockHandler, 1000);
      return;
    }

    if (CLOCK_TYPE === "bcd" && !isOpen) {
      if (this._setIntervalId) {
        clearInterval(this._setIntervalId);
        this._setIntervalId = null;
      }
    }
  };

  createBCDclock() {
    this._setIntervalId = null;

    this._bcdClock = new St.BoxLayout({
      vertical: false,
      style: "spacing: 10px;",
      style_class: "main-box",
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER,
    });

    this._hourBox = new BCDModule.Hour({ hour: 0 });
    this._minuteBox = new BCDModule.MinutesOrSeconds({ value: 0 });
    this._secondBox = new BCDModule.MinutesOrSeconds({ value: 0 });

    this._bcdClock.add_child(this._hourBox);
    this._bcdClock.add_child(this._minuteBox);
    this._bcdClock.add_child(this._secondBox);
  }

  bcdClockHandler = () => {
    const date = new Date();
    let hours = date.getHours();
    if (NUMERIC_CLOCK_FORMAT_BCD === "twelve-hr-format" && hours > 12) {
      hours = hours - 12;
    }

    this._hourBox.setHour(hours);
    this._minuteBox.setValue(date.getMinutes());
    this._secondBox.setValue(date.getSeconds());
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
    this._setTimeOutId = setTimeout(this.binaryClockHandler, msLeft);
  };

  disable() {
    if (this._openStateChangedHandlerId) {
      this._panelBtn.disconnect(this._openStateChangedHandlerId);
      this._openStateChangedHandlerId = null;
    }

    if (this._settings) {
      this._settings.disconnectObject(this);
      this._settings = null;
    }

    if (this._setIntervalId) {
      clearInterval(this._setIntervalId);
      this._setIntervalId = null;
    }

    if (this._setTimeOutId) {
      clearTimeout(this._setTimeOutId);
      this._setTimeOutId = null;
    }

    if (this._hourBox) {
      this._hourBox.destroy();
      this._hourBox = null;
    }

    if (this._minuteBox) {
      this._minuteBox.destroy();
      this._minuteBox = null;
    }

    if (this._secondBox) {
      this._secondBox.destroy();
      this._secondBox = null;
    }

    if (this._panelBtn) {
      this._panelBtn.destroy();
      this._panelBtn = null;
    }

    if (this._bcdClock) {
      this._bcdClock.destroy();
      this._bcdClock = null;
    }

    if (this._binaryClock) {
      this._binaryClock.destroy();
      this._binaryClock = null;
    }

    if (this._binWrapper) {
      this._binWrapper.destroy();
      this._binWrapper = null;
    }

    if (CLOCK_TYPE) {
      CLOCK_TYPE = null;
    }

    if (DISPLAY_NUMERIC_CLOCK_BCD) {
      DISPLAY_NUMERIC_CLOCK_BCD = null;
    }

    if (DISPLAY_NUMERIC_CLOCK_BIN) {
      DISPLAY_NUMERIC_CLOCK_BIN = null;
    }

    if (NUMERIC_CLOCK_FORMAT_BCD) {
      NUMERIC_CLOCK_FORMAT_BCD = null;
    }

    if (NUMERIC_CLOCK_FORMAT_BIN) {
      NUMERIC_CLOCK_FORMAT_BIN = null;
    }
  }
}

function init() {
  ExtUtils.initTranslations();
  return new Extension();
}
