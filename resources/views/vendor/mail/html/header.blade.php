@props(['url'])
{{-- Every email: the ZPPSU seal above the system name. The image loads from APP_URL, so recipients must be able to reach the server. --}}
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block; text-decoration: none;">
<img src="{{ asset('images/zppsu-logo.png') }}" width="64" height="64" alt="ZPPSU seal" style="display: block; margin: 0 auto 8px; width: 64px; height: 64px;">
<span style="color: #8b1a1a; font-size: 19px; font-weight: bold;">{!! $slot !!}</span>
</a>
</td>
</tr>
