import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  urlFrontend = 'http://localhost:4200'; 
  urlBackend = 'http://localhost:8080';

  getApiUrl(endpoint: string): string {
    return `${this.urlBackend}${endpoint}`;
  }

  getFrontEndUrl(endpoint: string): string {
    return `${this.urlFrontend}${endpoint}`;
  }

  handleErrorHttp(error: HttpErrorResponse) {
      console.error('Erro HTTP:', error);
  
      let message = 'Erro inesperado';
  
      if (error.error instanceof ErrorEvent) {
        message = error.error.message;
      } else {
        message = `Erro ${error.status}:${error.message}`;
      }
  
      return throwError(() => new Error(message));
  }
}
