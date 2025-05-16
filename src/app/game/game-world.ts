export interface Options {
  title: string;
  action: () => void;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  descriptionAfterGet: string;
  location: string;
  action: string;
  spawnsMonster?: boolean;
}

export interface Obstacle {
  id: string;
  title: string;
  description: string;
  location: string;
  neededItemId?: string;
  hint: string;
  action: string;
  completedDescription: string;
}

export interface GameMap {
  title: string;
  id: string;
  imageDescription: string;
  description: string;
  lookAroundDescription: string;
  lookAroundCompletedDescription?: string;
  directions?: Record<string, GameMap | string>;
  items?: Item[];
  obstacles?: Obstacle[];
  onlyMoveForwardIfObstaclesAreCompleted?: boolean;
}

export const gameWorld: GameMap = {
  id: 'start',
  title: 'Mansion Start',
  description: 'You stand in front of a creepy mansion, surrounded by mist.',
  lookAroundDescription: 'You can see windows almost falling of the house, an over grown grass on the sides and a weird tree on the left',
  imageDescription: 'Looking from the front garden, a falling a part mansion, with trees on the right and overgrown grass, on the right, some trash and a puddle',
  directions: {
    left: {
      id: 'MansionLeftSide',
      title: 'Left Side of Mansion',
      description: 'You are on the left side of the mansion. There’s a creepy tree nearby.',
      lookAroundCompletedDescription: 'There is nothing here',
      lookAroundDescription: 'A shiny object glints under the tree.',
      imageDescription: `A key inside some bushes under a tree`,
      items: [
        {
          id: 'key1',
          title: 'Rusty Key',
          action: 'Get Key',
          description: 'An old rusty key lies on the ground.',
          location: 'start',
          descriptionAfterGet: "You got the key, it's havier then it looks"
        }
      ],
    },
    forward: {
      id: 'MansionDoor',
      title: 'Mansion Door',
      description: 'You are front of the mansion door. The air smells old and musty.',
      lookAroundDescription: 'You see a locked door in front of you',
      lookAroundCompletedDescription: 'You can see the inside of the house',
      imageDescription: `In front of an old and abandoned mansion door`,
      obstacles: [
        {
          id: 'lockedDoor1',
          title: 'Locked Door',
          description: 'A heavy wooden door blocks your way.',
          completedDescription: 'You managed to open the door',
          location: 'MansionDoor',
          hint: 'Looks like it needs a key.',
          action: "open the door"
        },
      ],
      directions: {
        forward: {
          id: 'mainRoom',
          title: 'Mansion Main Room',
          description: 'You entered the Mansion. You can hear cracking wood sounds from many directions',
          lookAroundDescription: 'The room looks empty, besides a weird man painting in the wall, There are stairs in your right, a hallway in front of you and a kitchen on the right',
          onlyMoveForwardIfObstaclesAreCompleted: true,
          imageDescription: 'the main room of an old and abandoned mansion, with a weird man painting in the wall, There are stairs in the left, a hallway in front and a kitchen on the right',
        }
      }
    },
    right: {
      id: 'MansionRightSide',
      title: 'Right Side of Mansion',
      description: 'You are on the Right side of the mansion.',
      lookAroundDescription: 'A huge puddle is in front of you, be careful to now fall down.',
      imageDescription: `Some trash in the border of a big puddle`,
    },
  }
};
