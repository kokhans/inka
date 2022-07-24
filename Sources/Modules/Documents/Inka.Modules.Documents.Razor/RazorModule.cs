// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using Carcass.Cli.Logging.Spectre.Loggers.Abstracts;
using Carcass.Core;
using Carcass.FrontMatter.Razor.Parsers.Abstracts;
using Carcass.LocalStorage.Providers.Abstracts;
using Inka.Engine.Modules.Abstracts;
using Inka.Engine.Pipelines.Pipes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Inka.Modules.Documents.Razor;

public sealed class RazorModule : IModule
{
    public string Name => "Inka.Razor";
    public Type PipeType => typeof(IRazorPipe);

    public void ConfigureServices(
        IServiceCollection services,
        IConfiguration configuration,
        PipeConfiguration pipeConfiguration
    )
    {
        ArgumentVerifier.NotNull(services, nameof(services));
        ArgumentVerifier.NotNull(configuration, nameof(configuration));
        ArgumentVerifier.NotNull(pipeConfiguration, nameof(pipeConfiguration));

        services
            .AddSingleton<IRazorPipe>(sp => new RazorPipe(
                    sp.GetRequiredService<ISpectreCliLogger>(),
                    sp.GetRequiredService<ILocalStorageProvider>(),
                    pipeConfiguration,
                    Name,
                    sp.GetRequiredService<IRazorFrontMatterParser>()
                )
            )
            .AddCarcassRazorFrontMatterParser();
    }
}