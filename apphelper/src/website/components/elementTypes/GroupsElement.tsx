import { ElementInterface } from "../../helpers";
import { GroupsBrowser } from "../groups/GroupsBrowser";

interface Props {
  churchId: string;
  element: ElementInterface;
}

export const GroupsElement = (props: Props) => {
  const a = props.element?.answers || {};
  return (
    <GroupsBrowser
      churchId={props.churchId}
      category={a.category || undefined}
      label={a.label || undefined}
      title={a.title || undefined}
      showSearch={a.showSearch !== false}
      showCategory={a.showCategory !== false}
    />
  );
};
