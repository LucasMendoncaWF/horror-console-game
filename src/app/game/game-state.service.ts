import { Injectable } from '@angular/core';
import { GameMap, gameWorld, Item, Obstacle, Options } from './game-world';
import { BehaviorSubject } from 'rxjs';

enum Actions{
  Location = '',
  GetItem = 'getItem',
  UseOnObstacle = 'useOnObstacle',
  LookAround = 'lookAround',
  HasLookedAround = 'hasLookedAround',
}

function isString(value: any) {
  return typeof value === "string" || value instanceof String;
}

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private chasingInterval: ReturnType<typeof setInterval> | null = null;
  private walkingInterval: ReturnType<typeof setInterval> | null = null;
  private startChaseTimeout: ReturnType<typeof setTimeout> | null = null;
  private dangerTimeout: ReturnType<typeof setTimeout> | null = null;
  private deathTimeout: ReturnType<typeof setTimeout> | null = null;

  private locationSubject = new BehaviorSubject<GameMap>(gameWorld);
  private descriptionSubject = new BehaviorSubject<string>('');
  private optionsSubject = new BehaviorSubject<Options[]>([]);
  private monsterLocation = new BehaviorSubject<GameMap>(gameWorld);
  private monsterSpawned = new BehaviorSubject<boolean>(false);
  private monsterDescription = new BehaviorSubject<string>('');
  private isChasing = new BehaviorSubject<boolean>(false);
  private showRunText = new BehaviorSubject<boolean>(false);
  private gameOver = new BehaviorSubject<boolean>(false);

  currentLocation$ = this.locationSubject.asObservable();
  currentDescription$ = this.descriptionSubject.asObservable();
  currentOptions$ = this.optionsSubject.asObservable();
  monsterDescription$ = this.monsterDescription.asObservable();
  showRunText$ = this.showRunText.asObservable();
  gameOver$ = this.gameOver.asObservable();

  private itemsSubject: string[] = []
  private obstaclesCompletedSubject: string[] = [];
  private chasingPlayerMap: string[] = [];
  private chasingMap: string[] = [];
  private firstMeetWithMonster = false;

  constructor() {
    this.loadGameState();
    this.monsterSpawned.subscribe(hasSpawned => {
      if(hasSpawned) {
        this.isChasing.subscribe(isChasing => {
          if(isChasing) {
            if(this.chasingInterval) {
              clearInterval(this.chasingInterval);
            }
            this.walkingInterval = setInterval(() => {
              this.updateWalkingMonsterLocation();
            }, 2000);
          } else {
            if(this.walkingInterval) {
              clearInterval(this.walkingInterval);
            }
            this.chasingInterval = setInterval(() => {
              const index = this.chasingMap.length - 1;
              const newLocationId = this.chasingPlayerMap[index + 1];
              if(newLocationId) {
                this.teleportMonster(newLocationId);
              }
            }, 8000);
          }
        })
      }
    })
  }

  capitalizeFirstLetter(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  findParentNode(root: GameMap, targetId: string): GameMap | null {
    if (!root.directions) return null;

    for (const directionKey in root.directions) {
      const child = root.directions[directionKey];

      if (isString(child)) continue;

      if (child.id === targetId) {
        return root;
      }

      const parent = this.findParentNode(child, targetId);
      if (parent) {
        return parent;
      }
    }

    return null;
  }

  findNodeById(root: GameMap, targetId: string): GameMap | null {
    if (root.id === targetId) {
      return root;
    }

    if (!root.directions) return null;

    for (const directionKey in root.directions) {
      const child = root.directions[directionKey];

      if (isString(child)) return null;

      const found = this.findNodeById(child, targetId);
      if (found) return found;
    }
    return null;
  }

  private generateOptions(currentAction: Actions) {
    const currentLocation = this.locationSubject.getValue();
    const currentItems = this.itemsSubject;
    const currentObstacles = this.obstaclesCompletedSubject;
    const completedObstacles = [];
    const options: Options[] = [];
    const parent = this.findParentNode(gameWorld, currentLocation.id);

    if(currentAction === Actions.LookAround) {
      if(currentLocation.items?.length) {
        currentLocation.items.forEach(item => {
          if(!currentItems.includes(item.id)) {
            options.push({title: item.action, action: () => this.getItem(item)})
          }
        })
      }

      if(currentLocation.obstacles?.length) {
        currentLocation.obstacles.forEach(obstacle => {
          if(!currentObstacles.includes(obstacle.id)) {
            options.push({title: obstacle.action, action: () => this.completeObstacle(obstacle)})
          } else {
            completedObstacles.push(obstacle.id);
          }
        })
      }
    }

    if(currentAction !== Actions.LookAround) {
      options.push({title: "Look Around", action:() => this.onLookAround()})
    }

    if(!!currentLocation.directions) {
      Object.keys(currentLocation.directions).forEach(key => {
        const newLocation = (currentLocation.directions || {})[key];
        if((currentLocation.obstacles?.every(obstacle => currentObstacles.includes(obstacle.id)) || !currentLocation.obstacles || isString(newLocation) || !newLocation.onlyMoveForwardIfObstaclesAreCompleted)){
          options.push({title:`Go ${this.capitalizeFirstLetter(key)}`, action: () => isString(newLocation) ? this.teleport(newLocation) : this.updateLocation(newLocation)})
        }
      })
    }

    if(parent) {
      options.push({title:`Go Back`, action: () => this.updateLocation(parent)})
    }
    return options;
  }

  teleport(newLocationId:string) {
    const location = this.findNodeById(gameWorld, newLocationId);
    if(location) {
      this.updateLocation(location)
    }
  }

  updateLocation(newLocation: GameMap) {
    this.locationSubject.next(newLocation);
    this.descriptionSubject.next(newLocation.description);
    this.optionsSubject.next(this.generateOptions(Actions.Location));
    if(this.monsterSpawned.getValue()) {
      this.onUpdateLocationWithMonsterSpawned(newLocation);
    }
    this.saveGameState();
  }

  onUpdateLocationWithMonsterSpawned(newLocation: GameMap) {
    if(this.startChaseTimeout) {
      clearTimeout(this.startChaseTimeout);
    }
    if(this.dangerTimeout) {
      clearTimeout(this.dangerTimeout);
    }
    if(this.deathTimeout) {
      clearTimeout(this.deathTimeout);
    }
    if(this.monsterLocation.getValue().id === newLocation.id) {
      if(this.firstMeetWithMonster) {
        this.monsterDescription.next('What the- **** is this?');
      } else {
        this.monsterDescription.next('Shit, that thing is coming here.');
      }

      this.startChaseTimeout = setTimeout(() => {
        this.toggleChasing(true);
        this.monsterDescription.next("It's chasing me!");
        this.dangerTimeout = setTimeout(() => {
        this.monsterDescription.next("No, no, no!");
          this.dangerTimeout = setTimeout(() => {
            this.gameOver.next(true);
            this.resetGame();
          }, 5000);
        }, 5000);
      }, 5000);
    }

    if(this.isChasing.getValue()) {
      this.chasingPlayerMap.push(newLocation.id);
      this.showRunText.next(true);
    }

    if(this.chasingPlayerMap.length > this.chasingMap.length + 3) {
      this.toggleChasing(false);
      this.chasingMap = [];
      this.showRunText.next(false);
      this.monsterDescription.next("I think he lost me...");
    }
  }

  onLookAround() {
    const location = this.locationSubject.getValue();
    const completedObstacles =  location.obstacles ? location.obstacles.every(obstacle => this.obstaclesCompletedSubject.includes(obstacle.id)): true;
    const completedItems = location.items ? location.items?.every(item => this.itemsSubject.includes(item.id)) : true;
    if(completedObstacles && completedItems && location.lookAroundCompletedDescription) {
      this.descriptionSubject.next(location.lookAroundCompletedDescription);
      this.optionsSubject.next(this.generateOptions(Actions.HasLookedAround));
    } else {
      this.descriptionSubject.next(location.lookAroundDescription);
      this.optionsSubject.next(this.generateOptions(Actions.LookAround));
    }

  }

  getItem(item: Item) {
    this.itemsSubject.push(item.id);
    this.descriptionSubject.next(item.descriptionAfterGet);
    this.optionsSubject.next(this.generateOptions(Actions.GetItem));
    if(item.spawnsMonster) {
      setTimeout(() => {
        this.monsterSpawned.next(true);
      }, 10000);
    }
  }

  completeObstacle(obstacle: Obstacle) {
    const currentItems = this.itemsSubject;
    if(!obstacle.neededItemId || currentItems.includes(obstacle.neededItemId)) {
      this.obstaclesCompletedSubject.push(obstacle.id);
      this.descriptionSubject.next(obstacle.completedDescription);
      this.optionsSubject.next(this.generateOptions(Actions.UseOnObstacle));
    } else {
      this.descriptionSubject.next(obstacle.description + '\n\n' + obstacle.hint);
      this.optionsSubject.next(this.generateOptions(Actions.Location));
    }
    
  }

  goBack() {
    const location = this.locationSubject.getValue();
    this.locationSubject.next(location);
    this.descriptionSubject.next(location.description);
    this.optionsSubject.next(this.generateOptions(Actions.Location));
  }

  // Monster Logic

  updateMonsterLocation(newLocation: GameMap) {
    this.monsterLocation.next(newLocation);
  }

  toggleChasing(isChasing: boolean) {
    this.isChasing.next(isChasing);
  }

  updateFollowingMap(newId: string) {
    this.chasingMap.push(newId)
  }

  
  teleportMonster(newLocationId:string) {
    const location = this.findNodeById(gameWorld, newLocationId);
    if(location) {
      this.updateMonsterLocation(location);
    }
  }

  updateWalkingMonsterLocation() {
    const currentLocation = this.monsterLocation.getValue();
    const monsterDirections = [];
    if(currentLocation.directions) {
      Object.keys(currentLocation.directions).forEach(key => {
        const directions = currentLocation.directions as Record<string, GameMap | string>;
        const newId = isString(directions[key]) ? directions[key] : directions[key].id;
          monsterDirections.push(newId);
      });
    }
    const parent = this.findParentNode(gameWorld, currentLocation.id);
    if(parent) {
      monsterDirections.push(parent.id);
    }
    const randomDirection = monsterDirections[Math.floor(Math.random() * monsterDirections.length)];
    this.teleportMonster(randomDirection)

  }

  // save and load 
saveGameState() {
  const state = {
    currentLocationId: this.locationSubject.getValue().id,
    items: this.itemsSubject,
    obstacles: this.obstaclesCompletedSubject,
    monsterLocationId: this.monsterLocation.getValue().id,
    monsterSpawned: this.monsterSpawned.getValue(),
    isChasing: this.isChasing.getValue(),
    chasingPlayerMap: this.chasingPlayerMap,
    chasingMap: this.chasingMap,
    firstMeetWithMonster: this.firstMeetWithMonster,
  };
  localStorage.setItem('gameState', JSON.stringify(state));
}

loadGameState() {
  const stateString = localStorage.getItem('gameState');
  if (!stateString) return;
    try {
      const state = JSON.parse(stateString);

      const location = this.findNodeById(gameWorld, state.currentLocationId);
      const monsterLoc = this.findNodeById(gameWorld, state.monsterLocationId);

      if (location) this.locationSubject.next(location);
      if (monsterLoc) this.monsterLocation.next(monsterLoc);

      this.itemsSubject = state.items || [];
      this.obstaclesCompletedSubject = state.obstacles || [];
      this.monsterSpawned.next(state.monsterSpawned || false);
      this.isChasing.next(state.isChasing || false);
      this.chasingPlayerMap = state.chasingPlayerMap || [];
      this.chasingMap = state.chasingMap || [];
      this.firstMeetWithMonster = state.firstMeetWithMonster || false;

      this.descriptionSubject.next(location?.description || '');
      this.optionsSubject.next(this.generateOptions(Actions.Location));
    } catch (e) {
      console.error(e);
    }
  }

  resetGame() {
    this.locationSubject.next(gameWorld);
    this.descriptionSubject.next(gameWorld.description);
    this.itemsSubject = [];
    this.obstaclesCompletedSubject = [];
    this.monsterLocation.next(gameWorld);
    this.monsterSpawned.next(false);
    this.isChasing.next(false);
    this.chasingMap = [];
    this.chasingPlayerMap = [];
    this.firstMeetWithMonster = false;
    localStorage.removeItem('gameState');
  }
}
