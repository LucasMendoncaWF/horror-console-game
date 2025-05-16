import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scene',
  imports: [CommonModule],
  templateUrl: './scene.component.html',
  styleUrl: './scene.component.scss'
})
export class SceneComponent {
  currentImage = "url('')";
  imageLoading = true;
  showRunText = false;
  private subs = new Subscription();
  constructor(
    private gameService: GameStateService, 
    private http: HttpClient
  ) {}

  ngOnInit() {
    const subLocation = this.gameService.currentLocation$.subscribe(location => {

      
    });
    this.subs.add(subLocation);

    const subRunText = this.gameService.showRunText$.subscribe(showRunText => {
      this.showRunText = showRunText;
    });
    this.subs.add(subRunText);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
