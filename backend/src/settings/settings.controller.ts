import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  getProfile(@CurrentUser('sub') userId: string) {
    return this.settingsService.getProfile(userId);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.settingsService.updateProfile(userId, dto);
  }

  @Get('preferences')
  getPreferences(@CurrentUser('sub') userId: string) {
    return this.settingsService.getPreferences(userId);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.settingsService.updatePreferences(userId, dto);
  }

  @Get('security')
  getSecurity(@CurrentUser('sub') userId: string) {
    return this.settingsService.getSecurity(userId);
  }

  @Patch('security')
  updateSecurity(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateSecurityDto,
  ) {
    return this.settingsService.updateSecurity(userId, dto);
  }

  @Get('access')
  getAccess(@CurrentUser('sub') userId: string) {
    return this.settingsService.getAccess(userId);
  }
}
