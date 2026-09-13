import { WALKTHROUGH_CONTENT_ES } from '../utils/walkthroughData';

export interface PythonFileItem {
  path: string;
  category: 'core' | 'entities' | 'rooms' | 'systems' | 'maps' | 'root';
  description: string;
  code: string;
}

export const PYTHON_PROJECT_FILES: PythonFileItem[] = [
  {
    path: 'main.py',
    category: 'root',
    description: 'Game entry point. Initializes Pygame, displays window, and runs main loop.',
    code: `"""
Head Over Heels 2.0 - Sci-Fi Reborn
Modern 2.5D Isometric Puzzle-Adventure Game
Engine: Python 3 + Pygame
"""

import sys
import pygame
from src.core.game import Game
from src.core.constants import SCREEN_WIDTH, SCREEN_HEIGHT, FPS, TITLE

def main():
    pygame.init()
    pygame.font.init()
    pygame.mixer.init()

    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption(TITLE)
    clock = pygame.time.Clock()

    game = Game(screen)

    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0  # Delta time in seconds

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            else:
                game.handle_event(event)

        game.update(dt)
        game.render()
        pygame.display.flip()

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()
`,
  },
  {
    path: 'src/core/constants.py',
    category: 'core',
    description: 'Game dimensions, isometric 64x32 tile metrics, colors, and key bindings.',
    code: `"""Core Game Constants & Configurations"""

SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 768
FPS = 60
TITLE = "Head Over Heels 2.0 - Sci-Fi Reborn"

# 2.5D Isometric Dimetric 2:1 Tile Metrics
TILE_WIDTH = 64
TILE_HEIGHT = 32
TILE_Z_HEIGHT = 24  # Vertical pixels per elevation unit

# Palette (Cyberpunk Sci-Fi)
COLOR_BG = (10, 15, 29)
COLOR_WALL_TOP = (71, 85, 105)
COLOR_WALL_LEFT = (30, 41, 59)
COLOR_WALL_RIGHT = (51, 65, 85)
COLOR_FLOOR_A = (15, 23, 42)
COLOR_FLOOR_B = (20, 30, 51)
COLOR_CYAN = (56, 189, 248)
COLOR_MAGENTA = (192, 132, 252)
COLOR_GREEN = (52, 211, 153)
COLOR_RED = (239, 68, 68)
COLOR_AMBER = (245, 158, 11)
`,
  },
  {
    path: 'src/core/game.py',
    category: 'core',
    description: 'Main game manager orchestrating state, rooms, entities, and UI.',
    code: `"""Game Engine Controller"""

import pygame
from src.core.constants import SCREEN_WIDTH, SCREEN_HEIGHT, COLOR_BG
from src.rooms.room_manager import RoomManager
from src.entities.player import Player
from src.systems.renderer import IsometricRenderer
from src.systems.collision import CollisionSystem
from src.systems.save_system import SaveSystem

class Game:
    def __init__(self, screen):
        self.screen = screen
        self.room_manager = RoomManager()
        self.renderer = IsometricRenderer(screen)
        self.collision_system = CollisionSystem()
        self.save_system = SaveSystem()

        # Initialize Player in Sector 01
        current_room = self.room_manager.get_current_room()
        spawn = current_room.default_spawn
        self.player = Player(spawn["x"], spawn["y"], spawn["z"])

        self.is_paused = False
        self.is_victory = False
        self.is_game_over = False

    def handle_event(self, event):
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_p or event.key == pygame.K_ESCAPE:
                self.is_paused = not self.is_paused
            elif event.key == pygame.K_F5:
                self.save_system.save_game(self.player, self.room_manager)
            elif event.key == pygame.K_F9:
                self.save_system.load_game(self.player, self.room_manager)

    def update(self, dt):
        if self.is_paused or self.is_game_over or self.is_victory:
            return

        keys = pygame.key.get_pressed()
        current_room = self.room_manager.get_current_room()

        # 1. Update Player
        self.player.update(dt, keys, current_room, self.collision_system)

        # 2. Update Crates & Pressure Switches
        current_room.update_crates_and_switches(dt, self.player)

        # 3. Update Patrol Drones
        current_room.update_drones(dt, self.player)

        # 4. Check Items & Door Transitions
        current_room.check_item_pickups(self.player)
        door_result = current_room.check_doors(self.player)
        if door_result:
            target_room, spawn_coords = door_result
            self.room_manager.change_room(target_room)
            self.player.set_position(spawn_coords["x"], spawn_coords["y"], spawn_coords["z"])

        # 5. Check Victory Portal
        if current_room.check_exit_portal(self.player):
            self.is_victory = True

    def render(self):
        current_room = self.room_manager.get_current_room()
        self.renderer.render_room(current_room, self.player)
        self.renderer.render_ui(self.player, current_room, self.is_paused, self.is_victory)
`,
  },
  {
    path: 'src/entities/player.py',
    category: 'entities',
    description: 'Player entity with 8-direction isometric movement, jump, and inventory.',
    code: `"""Player Entity with 3D Isometric Physics"""

import pygame
import math
from src.core.constants import TILE_WIDTH, TILE_HEIGHT, TILE_Z_HEIGHT

class Player:
    def __init__(self, x, y, z):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
        self.vx = 0.0
        self.vy = 0.0
        self.vz = 0.0
        self.direction = "SE"
        self.is_grounded = True
        self.is_moving = False
        self.is_running = False

        self.health = 100
        self.max_health = 100
        self.energy = 100
        self.max_energy = 100

        self.keycards = []  # e.g. ["ALPHA", "BETA"]
        self.energy_cells = 0
        self.walk_timer = 0.0
        self.invulnerable_time = 0.0

    def update(self, dt, keys, room, collision_system):
        if self.invulnerable_time > 0:
            self.invulnerable_time = max(0.0, self.invulnerable_time - dt)

        # 8-Direction Isometric Input (Screen-relative or Iso-relative)
        dx = 0
        dy = 0
        if keys[pygame.K_UP] or keys[pygame.K_w]:
            dx -= 1
            dy -= 1
        if keys[pygame.K_DOWN] or keys[pygame.K_s]:
            dx += 1
            dy += 1
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            dx -= 1
            dy += 1
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            dx += 1
            dy -= 1

        self.is_moving = (dx != 0 or dy != 0)
        self.is_running = keys[pygame.K_LSHIFT] and self.energy > 5

        if self.is_moving:
            length = math.sqrt(dx * dx + dy * dy)
            nx = dx / length
            ny = dy / length
            speed = 4.8 if self.is_running else 3.0
            if self.is_running:
                self.energy = max(0, self.energy - dt * 12)

            move_dist = speed * dt
            # Test & Move along X and Y axes with collision slide
            next_x = self.x + nx * move_dist
            if collision_system.is_walkable(room, next_x, self.y, self.z):
                self.x = next_x
            else:
                room.try_push_crate(next_x, self.y, nx, 0, self.z)

            next_y = self.y + ny * move_dist
            if collision_system.is_walkable(room, self.x, next_y, self.z):
                self.y = next_y
            else:
                room.try_push_crate(self.x, next_y, 0, ny, self.z)

            self.walk_timer += dt * (14 if self.is_running else 8)
        else:
            self.energy = min(self.max_energy, self.energy + dt * 8)

        # Jump & Vertical Physics
        gravity = -14.0
        jump_force = 5.2

        ground_z = collision_system.get_ground_elevation(room, self.x, self.y)

        if keys[pygame.K_SPACE] and self.is_grounded:
            self.vz = jump_force
            self.is_grounded = False

        if not self.is_grounded:
            self.vz += gravity * dt
            self.z += self.vz * dt
            if self.z <= ground_z:
                self.z = ground_z
                self.vz = 0
                self.is_grounded = True
        else:
            if self.z > ground_z:
                self.is_grounded = False
            else:
                self.z = ground_z

    def damage(self, amount):
        if self.invulnerable_time <= 0:
            self.health = max(0, self.health - amount)
            self.invulnerable_time = 1.2

    def set_position(self, x, y, z):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
        self.vz = 0.0
`,
  },
  {
    path: 'src/entities/drone.py',
    category: 'entities',
    description: 'Autonomous security drone entity patrolling predefined waypoint paths.',
    code: `"""Patrol Drone Enemy Entity"""

import math

class PatrolDrone:
    def __init__(self, drone_id, x, y, z, waypoints, speed=2.0, damage=20):
        self.id = drone_id
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
        self.waypoints = waypoints
        self.current_waypoint = 0
        self.speed = speed
        self.damage = damage
        self.bob_timer = 0.0

    def update(self, dt, player):
        self.bob_timer += dt * 4.0
        if not self.waypoints:
            return

        target = self.waypoints[self.current_waypoint]
        dx = target[0] - self.x
        dy = target[1] - self.y
        dist = math.hypot(dx, dy)

        if dist < 0.1:
            self.current_waypoint = (self.current_waypoint + 1) % len(self.waypoints)
        else:
            move = self.speed * dt
            self.x += (dx / dist) * move
            self.y += (dy / dist) * move

        # Check collision with player
        player_dist = math.hypot(self.x - player.x, self.y - player.y)
        if player_dist < 0.75 and abs(self.z - player.z) < 1.0:
            player.damage(self.damage)
`,
  },
  {
    path: 'src/entities/crate.py',
    category: 'entities',
    description: 'Pushable isometric cargo block used for elevation climbing and pressure switches.',
    code: `"""Movable Crate / Physics Block"""

import math

class Crate:
    def __init__(self, crate_id, x, y, z, w=1, d=1, h=1, color="blue"):
        self.id = crate_id
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
        self.w = w
        self.d = d
        self.h = h
        self.color = color
        self.is_moving = False
        self.target_x = None
        self.target_y = None

    def update(self, dt):
        if self.is_moving and self.target_x is not None and self.target_y is not None:
            dx = self.target_x - self.x
            dy = self.target_y - self.y
            dist = math.hypot(dx, dy)

            if dist < 0.05:
                self.x = float(self.target_x)
                self.y = float(self.target_y)
                self.is_moving = False
                self.target_x = None
                self.target_y = None
            else:
                self.x += (dx / dist) * dt * 3.5
                self.y += (dy / dist) * dt * 3.5

    def push(self, target_x, target_y):
        if not self.is_moving:
            self.target_x = target_x
            self.target_y = target_y
            self.is_moving = True
`,
  },
  {
    path: 'src/entities/switch.py',
    category: 'entities',
    description: 'Floor pressure plate and toggle terminal switches.',
    code: `"""Switch and Pressure Plate Systems"""

class Switch:
    def __init__(self, switch_id, x, y, z, switch_type="pressure", target_laser=None, target_door=None):
        self.id = switch_id
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
        self.switch_type = switch_type  # 'pressure' or 'toggle'
        self.is_activated = False
        self.target_laser = target_laser
        self.target_door = target_door

    def check_activation(self, entities):
        """Checks if any player or crate is standing on pressure plate."""
        if self.switch_type == "pressure":
            pressed = False
            for ent in entities:
                dist = (ent.x - self.x) ** 2 + (ent.y - self.y) ** 2
                if dist < 0.45 and abs(ent.z - self.z) < 0.5:
                    pressed = True
                    break
            self.is_activated = pressed
        return self.is_activated
`,
  },
  {
    path: 'src/rooms/room.py',
    category: 'rooms',
    description: 'Room representation with 2D tile map, elevation heights, entities, and exits.',
    code: `"""Room Model and Entity Coordinator"""

import math
from src.entities.crate import Crate
from src.entities.drone import PatrolDrone
from src.entities.switch import Switch

class Room:
    def __init__(self, data):
        self.id = data["id"]
        self.name = data["name"]
        self.width = data["width"]
        self.depth = data["depth"]
        self.default_spawn = data["defaultPlayerSpawn"]
        self.floor_grid = data["floorGrid"]
        self.crates = [Crate(**c) for c in data.get("crates", [])]
        self.drones = [PatrolDrone(**d) for d in data.get("drones", [])]
        self.switches = [Switch(**s) for s in data.get("switches", [])]
        self.doors = data.get("doors", [])
        self.items = data.get("items", [])
        self.lasers = data.get("lasers", [])
        self.teleporters = data.get("teleporters", [])
        self.exit_portal = data.get("exitPortal", None)

    def update_crates_and_switches(self, dt, player):
        for crate in self.crates:
            crate.update(dt)

        active_occupants = [player] + self.crates
        for sw in self.switches:
            was_active = sw.is_activated
            is_active = sw.check_activation(active_occupants)

            if was_active != is_active:
                if sw.target_laser:
                    for laser in self.lasers:
                        if laser["id"] == sw.target_laser:
                            laser["isActive"] = not is_active

    def update_drones(self, dt, player):
        for drone in self.drones:
            drone.update(dt, player)

    def try_push_crate(self, target_x, target_y, dx, dy, player_z):
        for crate in self.crates:
            dist = math.hypot(target_x - crate.x, target_y - crate.y)
            if dist < 0.85 and abs(player_z - crate.z) < 0.5:
                dest_x = round(crate.x + (1 if dx > 0.3 else -1 if dx < -0.3 else 0))
                dest_y = round(crate.y + (1 if dy > 0.3 else -1 if dy < -0.3 else 0))
                if self.is_grid_free(dest_x, dest_y, crate.z):
                    crate.push(dest_x, dest_y)
                    return True
        return False

    def is_grid_free(self, gx, gy, z):
        if gx <= 0 or gx >= self.width - 1 or gy <= 0 or gy >= self.depth - 1:
            return False
        tile = self.floor_grid[gx][gy]
        if tile["type"] == "wall" or tile["elevation"] > z + 0.1:
            return False
        for c in self.crates:
            if round(c.x) == gx and round(c.y) == gy:
                return False
        return True

    def check_item_pickups(self, player):
        for item in self.items:
            if not item.get("isCollected", False):
                dist = math.hypot(player.x - item["x"], player.y - item["y"])
                if dist < 0.8 and abs(player.z - item["z"]) < 0.8:
                    item["isCollected"] = True
                    if item["type"] == "keycard_alpha":
                        player.keycards.append("ALPHA")
                    elif item["type"] == "keycard_beta":
                        player.keycards.append("BETA")
                    elif item["type"] == "energy_cell":
                        player.energy_cells += 1

    def check_doors(self, player):
        for door in self.doors:
            dist = math.hypot(player.x - door["x"], player.y - door["y"])
            if dist < 0.85:
                req = door.get("requiredKeycard")
                if not door.get("isOpen", False):
                    if req and req in player.keycards:
                        door["isOpen"] = True
                    else:
                        continue
                return door["leadsToRoom"], door["spawnCoords"]
        return None

    def check_exit_portal(self, player):
        if not self.exit_portal:
            return False
        dist = math.hypot(player.x - self.exit_portal["x"], player.y - self.exit_portal["y"])
        if dist < 1.0 and player.energy_cells >= self.exit_portal["requiredEnergyCells"]:
            return True
        return False
`,
  },
  {
    path: 'src/rooms/room_manager.py',
    category: 'rooms',
    description: 'Loads and caches JSON level sectors; manages room switching.',
    code: `"""Room Loading and Sector State Manager"""

import json
import os
from src.rooms.room import Room

class RoomManager:
    def __init__(self):
        self.rooms = {}
        self.current_room_id = "sector_01"
        self.load_all_sectors()

    def load_all_sectors(self):
        sector_files = ["sector_01.json", "sector_02.json", "sector_03.json"]
        maps_dir = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "maps")

        for fname in sector_files:
            fpath = os.path.join(maps_dir, fname)
            if os.path.exists(fpath):
                with open(fpath, "r") as f:
                    data = json.load(f)
                    self.rooms[data["id"]] = Room(data)

    def get_current_room(self):
        return self.rooms.get(self.current_room_id)

    def change_room(self, room_id):
        if room_id in self.rooms:
            self.current_room_id = room_id
`,
  },
  {
    path: 'src/systems/collision.py',
    category: 'systems',
    description: '3D isometric bounding box collision and elevation queries.',
    code: `"""3D Collision System for 2.5D Isometric World"""

import math

class CollisionSystem:
    def is_walkable(self, room, x, y, z, radius=0.32):
        if x - radius < 0 or x + radius >= room.width or y - radius < 0 or y + radius >= room.depth:
            return False

        points = [
            (x - radius, y - radius),
            (x + radius, y - radius),
            (x - radius, y + radius),
            (x + radius, y + radius),
        ]

        for px, py in points:
            gx = int(px)
            gy = int(py)
            if gx < 0 or gx >= room.width or gy < 0 or gy >= room.depth:
                return False
            tile = room.floor_grid[gx][gy]
            if tile["type"] == "wall":
                return False
            if tile["elevation"] > z + 0.25:
                return False

        # Collision against crates
        for crate in room.crates:
            if abs(x - crate.x) < 0.7 and abs(y - crate.y) < 0.7:
                if z < crate.z + crate.h - 0.15:
                    return False

        return True

    def get_ground_elevation(self, room, x, y):
        gx = int(x)
        gy = int(y)
        max_h = 0.0
        if 0 <= gx < room.width and 0 <= gy < room.depth:
            max_h = float(room.floor_grid[gx][gy]["elevation"])

        for crate in room.crates:
            if abs(x - crate.x) < 0.5 * crate.w and abs(y - crate.y) < 0.5 * crate.d:
                top = crate.z + crate.h
                if top > max_h:
                    max_h = top

        return max_h
`,
  },
  {
    path: 'src/systems/renderer.py',
    category: 'systems',
    description: 'Pygame isometric renderer converting 3D grid coords to 2D diamond tiles with depth sorting.',
    code: `"""Pygame 2.5D Isometric Diamond Grid Renderer"""

import pygame
from src.core.constants import (
    SCREEN_WIDTH, SCREEN_HEIGHT,
    TILE_WIDTH, TILE_HEIGHT, TILE_Z_HEIGHT,
    COLOR_WALL_TOP, COLOR_WALL_LEFT, COLOR_WALL_RIGHT,
    COLOR_FLOOR_A, COLOR_FLOOR_B, COLOR_CYAN, COLOR_RED, COLOR_AMBER, COLOR_GREEN
)

def world_to_screen(x, y, z):
    sx = (x - y) * (TILE_WIDTH // 2)
    sy = (x + y) * (TILE_HEIGHT // 2) - int(z * TILE_Z_HEIGHT)
    return sx, sy

class IsometricRenderer:
    def __init__(self, screen):
        self.screen = screen
        self.font = pygame.font.SysFont("Courier", 16, bold=True)
        self.title_font = pygame.font.SysFont("Courier", 24, bold=True)

    def render_room(self, room, player):
        cam_x, cam_y = world_to_screen(player.x, player.y, player.z)
        offset_x = SCREEN_WIDTH // 2 - cam_x
        offset_y = SCREEN_HEIGHT // 2 - cam_y

        self.screen.fill((10, 15, 29))

        draw_queue = []

        # Queue Floor & Walls
        for x in range(room.width):
            for y in range(room.depth):
                tile = room.floor_grid[x][y]
                elev = tile["elevation"]
                depth = (x + y) * 100 + elev * 10
                draw_queue.append((depth, lambda t=tile, gx=x, gy=y, el=elev: self.draw_tile(gx, gy, el, t, offset_x, offset_y)))

        # Queue Crates
        for crate in room.crates:
            depth = (crate.x + crate.y) * 100 + crate.z * 10 + 20
            draw_queue.append((depth, lambda c=crate: self.draw_crate(c, offset_x, offset_y)))

        # Queue Player
        p_depth = (player.x + player.y) * 100 + player.z * 10 + 30
        draw_queue.append((p_depth, lambda: self.draw_player(player, offset_x, offset_y)))

        # Sort and render
        draw_queue.sort(key=lambda item: item[0])
        for _, draw_fn in draw_queue:
            draw_fn()

    def draw_tile(self, x, y, elev, tile, ox, oy):
        sx, sy = world_to_screen(x, y, elev)
        sx += ox
        sy += oy
        hw = TILE_WIDTH // 2
        hh = TILE_HEIGHT // 2

        points = [(sx, sy - hh), (sx + hw, sy), (sx, sy + hh), (sx - hw, sy)]
        color = COLOR_WALL_TOP if tile["type"] == "wall" else (COLOR_FLOOR_A if (x + y) % 2 == 0 else COLOR_FLOOR_B)
        pygame.draw.polygon(self.screen, color, points)
        pygame.draw.polygon(self.screen, (30, 41, 59), points, 1)

    def draw_crate(self, crate, ox, oy):
        sx, sy = world_to_screen(crate.x, crate.y, crate.z)
        sx += ox
        sy += oy
        pygame.draw.rect(self.screen, COLOR_CYAN, (sx - 16, sy - 24, 32, 24))

    def draw_player(self, player, ox, oy):
        sx, sy = world_to_screen(player.x, player.y, player.z)
        sx += ox
        sy += oy
        # Draw shadow
        gx, gy = world_to_screen(player.x, player.y, 0)
        pygame.draw.ellipse(self.screen, (0, 0, 0, 100), (gx + ox - 12, gy + oy - 6, 24, 12))
        # Draw player cyber-body
        pygame.draw.circle(self.screen, COLOR_AMBER, (sx, sy - 18), 10)
        pygame.draw.rect(self.screen, COLOR_CYAN, (sx - 4, sy - 21, 8, 4))

    def render_ui(self, player, room, is_paused, is_victory):
        # Health & Energy Bar HUD
        pygame.draw.rect(self.screen, (15, 23, 42), (20, 20, 220, 70), border_radius=4)
        pygame.draw.rect(self.screen, COLOR_CYAN, (20, 20, 220, 70), 1, border_radius=4)

        h_text = self.font.render(f"HULL: {player.health}%", True, COLOR_RED if player.health < 30 else COLOR_GREEN)
        self.screen.blit(h_text, (30, 30))

        e_text = self.font.render(f"CELLS: {player.energy_cells}", True, COLOR_CYAN)
        self.screen.blit(e_text, (30, 55))

        room_text = self.font.render(f"LOCATION: {room.name}", True, (241, 245, 249))
        self.screen.blit(room_text, (SCREEN_WIDTH - 320, 30))
`,
  },
  {
    path: 'assets/maps/sector_01.json',
    category: 'maps',
    description: 'JSON definition for Sector 01: Awakening Dock.',
    code: `{
  "id": "sector_01",
  "name": "Sector 01: Cryo-Dock",
  "width": 10,
  "depth": 10,
  "defaultPlayerSpawn": { "x": 2, "y": 2, "z": 0, "direction": "SE" },
  "crates": [
    { "crate_id": "c1", "x": 3, "y": 5, "z": 0, "w": 1, "d": 1, "h": 1, "color": "blue" }
  ],
  "switches": [
    { "switch_id": "s1", "x": 3, "y": 7, "z": 0, "switch_type": "pressure", "target_laser": "laser1" }
  ],
  "doors": [
    { "id": "d1", "x": 9, "y": 4.5, "z": 0, "isOpen": true, "leadsToRoom": "sector_02", "spawnCoords": { "x": 1, "y": 5, "z": 0 } }
  ]
}`,
  },
  {
    path: 'requirements.txt',
    category: 'root',
    description: 'Python package requirements.',
    code: `pygame>=2.5.0
`,
  },
  {
    path: 'README.md',
    category: 'root',
    description: 'Instructions on running the Python + Pygame standalone game.',
    code: `# Head Over Heels 2.0 - Sci-Fi Reborn (Python + Pygame)

A modern 2.5D isometric puzzle-adventure game inspired by the 1987 classic *Head Over Heels*.

## Features
- True 2.5D Isometric dimetric projection (64x32 grid ratio)
- 8-directional smooth movement, walk, run, and 3D jumping
- Physics crate pushing to reach higher platforms and hold down pressure switches
- Security patrol drones with waypoint pathfinding
- Keycard access doors (Alpha & Beta tiers)
- Dynamic room transitions across interconnected sectors
- Laser hazards and energy cell collection
- Hyperspace Exit Portal extraction

## Setup & Running
1. Install Python 3.9+
2. Install requirements:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`
3. Launch game:
   \`\`\`bash
   python main.py
   \`\`\`

## Controls
- **Arrow Keys / WASD**: 8-Direction Isometric Movement
- **SPACE**: Jump
- **LEFT SHIFT**: Run (Boost Thrusters)
- **E / F**: Interact with switches & terminals
- **P / ESC**: Pause Menu
- **F5 / F9**: Quick-Save / Quick-Load
`,
  },
  {
    path: 'WALKTHROUGH.md',
    category: 'root',
    description: 'Guía oficial completa y táctica descargable de todos los sectores, fragmentos y puzles.',
    code: WALKTHROUGH_CONTENT_ES,
  },
];
