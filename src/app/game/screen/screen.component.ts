import { Component } from '@angular/core';
import { ConsoleComponent } from '../console/console.component';
import { SceneComponent } from '../scene/scene.component';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../game-state.service';
import { Subscription } from 'rxjs';
import { gameWorld } from '../game-world';

@Component({
  selector: 'app-screen',
  imports: [ConsoleComponent, SceneComponent, CommonModule],
  templateUrl:'./screen.component.html',
  styleUrl: './screen.component.scss'
})
export class ScreenComponent {
  hasAllowedAudio = false;
  gameOver = false;
  isContinue = false;
  private subs = new Subscription();
  
  constructor(
    private gameService: GameStateService,
  ) {
    const subGameOver = this.gameService.gameOver$.subscribe(gameOver => {
      this.gameOver = gameOver;
      if(gameOver) {
        this.hasAllowedAudio = false;
      }
    });
    this.subs.add(subGameOver);

    const subHasStarted = this.gameService.hasStarted$.subscribe(hasStarted => {
        this.isContinue = hasStarted;
    });
    this.subs.add(subHasStarted);
  }

  allowAudio() {
    this.hasAllowedAudio = true;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
