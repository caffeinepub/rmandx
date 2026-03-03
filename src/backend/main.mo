import Map "mo:core/Map";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";



actor {
  module DayEntry {
    public func compareByDate(a : DayEntry, b : DayEntry) : Order.Order {
      Text.compare(b.date, a.date);
    };
  };

  type DayEntry = {
    date : Text;
    pnlPct : Float;
    trades : Nat;
    rr : Float;
    riskPct : Float;
    londonPct : Float;
    nyPct : Float;
    asiaPct : Float;
    gbpjpyPct : Float;
    eurusdPct : Float;
    usdjpyPct : Float;
    gbpusdPct : Float;
    xauusdPct : Float;
    us30Pct : Float;
    audusdPct : Float;
    psych : Nat;
    commissions : Float;
    slippage : Float;
    note : Text;
    source : Text;
  };

  type UserSettings = {
    weeklyGoal : Float;
    dailyGoal : Float;
    ddLimit : Float;
    trackedPairs : [Text];
    oandaAccountId : Text;
    oandaApiKey : Text;
    oandaEnv : Text;
    lastSync : Int;
  };

  let dayEntries = Map.empty<Text, DayEntry>();
  var settings : ?UserSettings = null;

  public shared ({ caller }) func addOrUpdateDayEntry(newDayEntry : DayEntry) : async () {
    dayEntries.add(newDayEntry.date, newDayEntry);
  };

  public query ({ caller }) func getDayEntry(date : Text) : async DayEntry {
    switch (dayEntries.get(date)) {
      case (null) { Runtime.trap("Day entry not found") };
      case (?entry) { entry };
    };
  };

  public query ({ caller }) func getAllDayEntries() : async [DayEntry] {
    let entries = dayEntries.values().toArray();
    entries.sort(DayEntry.compareByDate);
  };

  public shared ({ caller }) func deleteDayEntry(date : Text) : async Bool {
    let existed = dayEntries.containsKey(date);
    dayEntries.remove(date);
    existed;
  };

  public shared ({ caller }) func saveSettings(newSettings : UserSettings) : async () {
    settings := ?newSettings;
  };

  public query ({ caller }) func getSettings() : async UserSettings {
    switch (settings) {
      case (?s) { s };
      case (null) {
        {
          weeklyGoal = 0.0;
          dailyGoal = 0.0;
          ddLimit = -2.0;
          trackedPairs = [];
          oandaAccountId = "";
          oandaApiKey = "";
          oandaEnv = "practice";
          lastSync = 0;
        };
      };
    };
  };
};
