import OpeningScreen from '../components/opening/opening-screen';
import '../components/opening/opening.css';

/**
 * Root: the opening/title screen (BB-224, founder OS-* boards). The
 * dev-mode landing and the prod AuthStatus panel are replaced by the
 * title screen; its PLAY NOW carries the dev-play-button testid and
 * the dev affordances (practice, named players) sit in a quiet row.
 */
export default function Home() {
  return <OpeningScreen />;
}
