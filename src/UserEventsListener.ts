import {
  UserEventName,
  UserEvents,
  UserInterface,
  WithDataCallback,
} from "./types";
import events, { EventSubscription } from "@mongez/events";

export default class UserEventsListener implements UserEvents {
  public constructor(public name: string) {}

  /**
   * {@inheritdoc}
   */
  public onBoot(callback: WithDataCallback): EventSubscription {
    return this.on("logout", callback);
  }

  /**
   * {@inheritdoc}
   */
  public onLogin(callback: WithDataCallback): EventSubscription {
    return this.on("login", callback);
  }

  /**
   * {@inheritdoc}
   */
  public onLogout(callback: (user: UserInterface) => void): EventSubscription {
    return this.on("logout", callback);
  }

  /**
   * {@inheritdoc}
   */
  public onChange(
    callback: (newData: any, oldData: any, user: UserInterface) => void
  ): EventSubscription {
    return this.on("change", callback);
  }

  /**
   * {@inheritdoc}
   */
  public onKeyChange(
    callback: (
      key: string,
      newValue: any,
      oldValue: any,
      user: UserInterface
    ) => void
  ): EventSubscription {
    return this.on("logout", callback);
  }

  /**
   * Listen to an event
   */
  public on(eventName: UserEventName, callback: any) {
    return events.subscribe(this.name + "." + eventName, callback);
  }

  /**
   * {@inheritdoc}
   */
  public triggerBoot(initData: any, user: UserInterface): void {
    this.trigger("boot", initData, user);
  }

  /**
   * {@inheritdoc}
   */
  public triggerLogin(userData: any, user: UserInterface): void {
    this.trigger("login", userData, user);
  }

  /**
   * {@inheritdoc}
   */
  public triggerLogout(user: UserInterface): void {
    this.trigger("logout", user);
  }

  /**
   * {@inheritdoc}
   */
  public triggerChange(newData: any, oldData: any, user: UserInterface) {
    this.trigger("change", newData, oldData, user);
  }

  /**
   * {@inheritdoc}
   */
  public triggerKeyChange(
    key: string,
    newValue: any,
    oldValue: any,
    user: UserInterface
  ): void {
    this.trigger("keyChange", key, newValue, oldValue, user);
  }

  /**
   * Trigger the given event name
   */
  public trigger(eventName: UserEventName, ...args: any[]) {
    return events.trigger(this.name + "." + eventName, ...args);
  }
}
