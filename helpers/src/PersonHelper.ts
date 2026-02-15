import { PersonInterface, ContactInfoInterface } from "./interfaces/index.js";
import { CommonEnvironmentHelper } from "./CommonEnvironmentHelper.js";

export class PersonHelper {

  public static getPhotoPath(churchId: string, person: any) {
    if (!person.photoUpdated) {
      if (person.id?.startsWith("PER0000")) return "https://app.staging.b1.church/images/demo/avatars/" + person.id + ".svg";
      else return "";
    } else return "/" + churchId + "/membership/people/" + person.id + ".png?dt=" + new Date(person.photoUpdated).getTime().toString();
  }

  static getPhotoUrl(person: PersonInterface) {
    if (!person?.photo) return "/images/sample-profile.png";
    else {
      return (person?.photo?.startsWith("data:image/png;base64,") || person.photo?.indexOf("://") > -1)
        ? person.photo
        : CommonEnvironmentHelper.ContentRoot + person.photo;
    }
  }

  static getAge(birthdate: Date): string {
    if (birthdate !== undefined && birthdate !== null) {
      const ageDifMs = Date.now() - new Date(birthdate).getTime();
      const ageDate = new Date(ageDifMs);
      const years = Math.abs(ageDate.getUTCFullYear() - 1970);
      return years + " years";
    } else return "";
  }

  public static getDisplayNameFromPerson(person: any) {
    if (person?.name?.nick !== null && person?.name?.nick !== "" && person?.name?.nick !== undefined) return person.name.first + " \"" + person.name.nick + "\" " + person.name.last;
    else return person.name.first + " " + person.name.last;
  }

  static getDisplayName(firstName: string, lastName: string, nickName: string): string {
    if (nickName !== undefined && nickName !== null && nickName.length > 0) return firstName + ' "' + nickName + '" ' + lastName;
    else return firstName + " " + lastName;
  }

  public static getBirthMonth(birthdate: Date): number {
    if (birthdate) return new Date(birthdate).getMonth() + 1;
    else return -1;
  }

  public static compareAddress(address1: ContactInfoInterface, address2: ContactInfoInterface): boolean {
    const displayAddress1: string = this.addressToString(address1).trim();
    const displayAddress2: string = this.addressToString(address2).trim();

    if (displayAddress1 !== displayAddress2) {
      return true;
    }
    return false;
  }

  public static addressToString(address: ContactInfoInterface): string {
    return `${address.address1 || ""} ${address.address2 || ""} ${address.city || ""}${(address.city && address.state) ? "," : ""} ${address.state || ""} ${address.zip || ""}`;
  }

  public static changeOnlyAddress(contactInfo1: ContactInfoInterface, contactInfo2: ContactInfoInterface): ContactInfoInterface {
    const updatedAddress: ContactInfoInterface = {
      ...contactInfo1,
      address1: contactInfo2.address1,
      address2: contactInfo2.address2,
      city: contactInfo2.city,
      state: contactInfo2.state,
      zip: contactInfo2.zip
    };

    return updatedAddress;
  }

  public static checkAddressAvailabilty(person: PersonInterface): boolean {
    const addressString: string = this.addressToString(person.contactInfo).trim();
    if (addressString !== "") {
      return true;
    }
    return false;
  }
}
