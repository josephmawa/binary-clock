const { St, Clutter } = imports.gi;

const ExtUtils = imports.misc.extensionUtils;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Me = ExtUtils.getCurrentExtension();
const BCDModule = Me.imports.bcd;

class Extension {
  constructor() {
    this.timerId = null;
  }

  enable() {
    this.panelBtn = new PanelMenu.Button(0.0, Me.metadata.name, false);

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

    this.panelBtn.menu.connect("open-state-changed", (paneBtn, isOpen) => {
      this.intervalHandler();
      if (isOpen) {
        this.timerId = setInterval(this.intervalHandler, 1000);
      } else {
        if (this.timerId) {
          clearInterval(this.timerId);
          this.timerId = null;
        }
      }
    });

    Main.panel.addToStatusArea(Me.metadata.uuid, this.panelBtn, 0);
  }

  intervalHandler = () => {
    const date = new Date();

    this.hourBox.setHour(date.getHours());
    this.minuteBox.setValue(date.getMinutes());
    this.secondBox.setValue(date.getSeconds());
  };

  disable() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.panelBtn) {
      this.panelBtn.destroy();
      this.panelBtn = null;
    }
  }
}

function init() {
  return new Extension();
}
