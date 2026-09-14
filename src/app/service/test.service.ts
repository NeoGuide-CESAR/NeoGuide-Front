import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ConfigService } from '../config/service/config.service';

@Injectable({
  providedIn: 'root'
})
export class TestService {

    constructor(
        private readonly http: HttpClient,
        private readonly configService: ConfigService,
    ) {};

    helloWorld(): Observable<number> {
        return this.http
      .get<number>(this.configService.getApiUrl('/test'), 
      { withCredentials: true })
    }


}
