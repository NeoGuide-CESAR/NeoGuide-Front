import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfigService } from './config/service/config.service';
import { TestService } from './service/test.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Whatsapp_Web_Front';

  constructor(
    private readonly configService: ConfigService,
    private readonly testService: TestService,
  ){}

  numero: number | string = 0;

  gerarNovoNumero(): void {
    this.testService.helloWorld().subscribe({
      next: (response) => {
        console.log(response);
        this.numero = response;
      },
      error: (error) => {
        console.log(error);
        this.numero = 'Erro ao chamar o backend: ' + error;
      }
    });
  }

}
