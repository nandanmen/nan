import { useActiveSection } from "../../../components/scroller";

export function Internet() {
  const activeSection = useActiveSection();

  return <output>{activeSection}</output>;
}
