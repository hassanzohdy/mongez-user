import events from "@mongez/events";
import { UserEvents, UserInterface } from "./types";

const userKeyChange = "keyChange";

const userBoot = "boot";

const userDataChange = "change";

const userLogin = "login";

const userLogout = "logout";

export const userEvents: UserEvents = {
  baseName: "user",
  name(...segments: string[]): string {
    return this.baseName + segments.map((segment) => "." + segment);
  },
  onBoot(callback: any): void {
    events.addEventListener(this.name(userBoot), callback);
  },
  onChange(callback: any): void {
    events.addEventListener(this.name(userDataChange), callback);
  },
  onKeyChange(key: string, callback: any): void {
    events.addEventListener(this.name(userKeyChange, key), callback);
  },
  onLogin(callback: any): void {
    events.addEventListener(this.name(userLogin), callback);
  },
  onLogout(callback: any): void {
    events.addEventListener(this.name(userLogout), callback);
  },
  triggerBoot(initData: any, user: UserInterface): void {
    events.trigger(this.name(userBoot), initData, user);
  },
  triggerChange(newData: any, oldData: any, user: UserInterface): void {
    events.trigger(this.name(userDataChange), newData, oldData, user);
  },
  triggerKeyChange(
    key: string,
    newValue: any,
    oldValue: any,
    user: UserInterface
  ): void {
    events.trigger(this.name(userKeyChange, key), newValue, oldValue, user);
  },
  triggerLogin(userData: any, user: UserInterface): void {
    events.trigger(this.name(userLogin), userData, user);
  },
  triggerLogout(user: UserInterface) {
    events.trigger(this.name(userLogout), user);
  },
};
