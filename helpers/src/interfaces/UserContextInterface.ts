import { LoginUserChurchInterface, UserInterface } from "./Access.js";
import { PersonInterface } from "./Membership.js";

export interface UserContextInterface {
  user: UserInterface;
  setUser: (user: UserInterface) => void;
  person: PersonInterface;
  setPerson: (person: PersonInterface) => void;
  userChurch: LoginUserChurchInterface;
  setUserChurch: (userChurch: LoginUserChurchInterface) => void;
  userChurches: LoginUserChurchInterface[];
  setUserChurches: (userChurches: LoginUserChurchInterface[]) => void;
}
