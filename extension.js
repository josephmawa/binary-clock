const { St, Clutter, GLib } = imports.gi;

const ExtUtils = imports.misc.extensionUtils;
const { gettext: _, ngettext, pgettext } = ExtUtils;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Me = ExtUtils.getCurrentExtension();
const BCDModule = Me.imports.bcd;

let USE_24_HRS = null;
let DISPLAY_BCD = null;

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
    const icon = new St.Icon({
      icon_name: "emoji-recent-symbolic",
      style_class: "system-status-icon",
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
    // Create UIs and add them to the dropdown as the user changes
    // settings
    this.createBinClock();
    this.createBCDclock();
    // Call this method after creating Binary and BCD clocks
    this.createUI();

    this.panelBtn.menu.connect("open-state-changed", (panelBtn, isOpen) => {
      if (!DISPLAY_BCD && isOpen) {
        this.binaryClockHandler();
        return;
      }

      if (!DISPLAY_BCD && !isOpen) {
        clearTimeout(this._timeOutId);
        this._timeOutId = null;
        return;
      }

      if (DISPLAY_BCD && isOpen) {
        this.bcdClockHandler();
        this.timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
          this.bcdClockHandler();
          return GLib.SOURCE_CONTINUE;
        });
        return;
      }

      if (DISPLAY_BCD && !isOpen) {
        if (this.timerId) {
          GLib.Source.remove(this.timerId);
          this.timerId = null;
        }
      }
    });
  }

  createUI() {
    if (this._timeOutId) {
      clearTimeout(this._timeOutId);
      this._timeOutId = null;
    }

    if (this.timerId) {
      GLib.Source.remove(this.timerId);
      this.timerId = null;
    }

    const displayBcd = this.settings.get_boolean("display-bcd");
    if (displayBcd) {
      this._binWrapper.set_child(this.bcdClock);
      return;
    }

    this._binWrapper.set_child(this._binaryClock);
  }

  createBinClock() {
    this._timeOutId = null;
    this._binaryClock = new BCDModule.BinaryClock();
  }

  bindSettings() {
    this.settings = ExtUtils.getSettings();
    this.timeFormatHandler();
    this.settings.connect(
      "changed::twenty-four-hour-format",
      this.timeFormatHandler,
    );

    this.UIFormatHandler();
    this.settings.connect("changed::display-bcd", this.UIFormatHandler);
  }

  createBCDclock() {
    this.timerId = null;

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

  timeFormatHandler = () => {
    if (!this.settings) this.settings = ExtUtils.getSettings();
    USE_24_HRS = this.settings.get_boolean("twenty-four-hour-format");
  };

  UIFormatHandler = () => {
    if (!this.settings) this.settings = ExtUtils.getSettings();
    DISPLAY_BCD = this.settings.get_boolean("display-bcd");
  };

  bcdClockHandler = () => {
    const date = new Date();
    let hours = date.getHours();
    if (USE_24_HRS === false && hours > 12) {
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
    const binClock = BCDModule.convertToBinClock(ratio);

    this._binaryClock.setBinClock(binClock);
    const msLeft = DURATION - (msElapsed % DURATION);
    this._timeOutId = setTimeout(this.binaryClockHandler, msLeft);
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
  ExtUtils.initTranslations();
  return new Extension();
}
