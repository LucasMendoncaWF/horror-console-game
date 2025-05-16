import { Component } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { Subscription } from 'rxjs';
import { GameMap, gameWorld, Options } from '../game-world';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-console',
  imports: [CommonModule],
  templateUrl: './console.component.html',
  styleUrl: './console.component.scss',
})
export class ConsoleComponent {
  showingText = '';
  completedTyping = false;
  options: Options[] = [];
  currentLocation: GameMap = gameWorld;
  private typingInterval: any;
  private lastFullText = '';
  private subs = new Subscription();

  constructor(
    private gameService: GameStateService, 
    private http: HttpClient
  ) {}

  ngOnInit() {
    const subDescription = this.gameService.currentDescription$.subscribe(fullText => {
      if (fullText !== this.lastFullText) {
        this.showingText = '';
        this.completedTyping = false;
        this.textToSpeech(fullText);
      }
    });
    this.subs.add(subDescription);
    const subLocation = this.gameService.currentLocation$.subscribe(location => {
      if (location.id !== this.currentLocation.id) {
        this.currentLocation = location;
      }
    });
    this.subs.add(subLocation);
    const subOptions = this.gameService.currentOptions$.subscribe(options => {
      this.options = options;
    });
    this.subs.add(subOptions);
  }

  async textToSpeech(text: string) {
    console.log('TEST1!')
    this.http.post<Blob>('.netlify/functions/textToSpeech', {text},{ responseType: 'blob' as any }).subscribe(blob => {
      const audioUrl = URL.createObjectURL(blob);

      const audio = document.querySelector('audio') as HTMLAudioElement;
      audio.src = audioUrl;
      audio.load();
      audio.play();
      this.animateText(text);
    });
  }

  animateText(fullText: string) {
    clearInterval(this.typingInterval);
    this.showingText = '';
    this.lastFullText = fullText;
    let index = 0;

    this.typingInterval = setInterval(() => {
      if (index < fullText.length) {
        this.showingText += fullText[index];
        index++;
      } else {
        this.completedTyping = true;
        clearInterval(this.typingInterval);
      }
    }, 30);
  }

  ngOnDestroy() {
    clearInterval(this.typingInterval);
    this.subs.unsubscribe();
  }
}
