import { child, get, ref, update } from "@firebase/database";
import { database } from "../../services/firebase";
import { ToastStyle } from "../enums";
import { shuffle } from "../random";
import { Action } from "./action";

const MS_IN_DAY = 60 * 60 * 24 * 1000;

export class Login extends Action {
  async validateParams(username) {
    const all_crews = (await get(child(ref(database), "crews"))).val();
    const auth = username && username in all_crews;
    if (!auth) {
      this.setState({
        ...this.state,
        toast: {
          show: true,
          style: "error",
          message: "Invalid Username",
        },
      });
    }
    return auth;
  }

  updateState(username) {
    return {
      ...this.state,
      crew: username,
      toast: {
        show: true,
        style: ToastStyle.Success,
        message: "Logged In",
      },
    };
  }

  async postRun(username) {
    // update seating
    const game = (await get(child(ref(database), `crews/${username}`))).val();
    const now = Date.now();
    if (game.seatingTtl < now) {
      update(ref(database), {
        [`crews/${username}/seating`]: shuffle(Object.keys(game.active)),
        [`crews/${username}/seatingTtl`]: now + MS_IN_DAY,
      });
    }
  }
}
