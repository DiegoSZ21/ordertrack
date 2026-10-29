import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { SocketService } from './core/services/socket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);

  ngOnInit(): void {
    // Conectar socket si el usuario está autenticado
    if (this.authService.isLoggedIn) {
      this.socketService.connect();
    }

    // Conectar / desconectar cuando cambie la sesión
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.socketService.connect();
      } else {
        this.socketService.disconnect();
      }
    });
  }
}

